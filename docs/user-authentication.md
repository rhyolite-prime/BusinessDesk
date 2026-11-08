# Users and authentication

## Password login

- `POST /api/v1/auth/host-login`: `{"usernameOrEmail":"admin","password":"..."}`
- `POST /api/v1/auth/tenant-login`:
  `{"accountId":"acme","usernameOrEmail":"user@example.com","password":"..."}`

`accountId` is the tenant's **tenancy name**, resolved to a tenant UUID. Tenant
login requires an active, non-deleted tenant and an active, unlocked user within
that tenant; ordinary tenant users are supported, not only tenant administrators.
Host login requires a host user (`is_host_admin_user=true`) with a NULL tenant
(legacy) or the protected default host tenant. Bootstrap host-tenant users receive
host-scoped tokens. See `tenant-management.md` for the first-install seed.
Credential failures return the same generic message; password hashes and passkey
material are never included in service responses.

Configure `custom_config.JwtBearer` (as in config.json) with a nonempty
`JwtSecurityKey`, `JwtIssuer`, optional `JwtAudience`, and positive
`JwtExpirationTime` **in seconds** (default 3600). No token is issued if the key,
issuer, or lifetime is invalid. Login responses include `token`, `expiresIn`,
`permissions`, and public user identity fields. Responses are marked `no-store`.

Host tokens carry `hostUserId`, `hostUserEmail`, `hostUserName`. Tenant tokens carry
`tenantId`, `tenantName`, `tenantUserId`, `tenantUserEmail`. There is no tenant email
column in `Tenants`, so the optional `tenantEmail` claim is not fabricated.
Both carry `iss`, `sub`, `iat`, `exp` and optional `aud`. Tenant JWTs also carry
a signed boolean `mfa`; required tenant 2FA must complete before a JWT is issued.
See [tenant TOTP deployment and flow](tenant-two-factor-authentication.md). Tokens identify the
user and realm; **permissions are not included in new JWTs**. The login response
still contains a current permissions array for UI display, not authorization.

### Protected-request authorization

Both JWT filters follow the same asynchronous flow on every protected request:

1. Verify HS256 signature, configured issuer/audience and expiration; require the
   realm-specific user ID (and tenant ID for tenant tokens). Reject opposite-realm
   claims and, when present, a subject that does not match the user ID. When the
   current tenant requires 2FA, require signed `mfa: true` evidence.
2. Load the current user with `is_deleted = false`, active and unlocked status.
   Check exact tenant membership and the host-admin flag. Host users must belong
   to the protected host tenant or have a legacy NULL tenant. The protected host
   tenant cannot be used through the tenant filter.
3. For users with a tenant, require that tenant to be active and non-deleted.
4. Resolve current direct roles and live group memberships. Every role, including
   group roles, must match the user's current tenant (NULL matches only NULL).
   Groups currently have no tenant column; membership is read only from the
   authenticated user's database row. Missing/deleted groups or missing/foreign
   roles grant nothing; database errors and malformed authorization data fail the
   whole resolution, never return partial grants.
5. Attach the validated identity, current database display fields and an
   `unordered_set<string>` named `permissions` to the request. Controllers keep
   their existing synchronous `hasPermission` guards; no DB work runs in a guard.

There is **no permission cache initially**. Permission/membership changes and
user or tenant deactivation/deletion/lockout apply on the next request using the
same token. Older signed tokens may contain a permissions claim: it is ignored,
regardless of its shape. Tokens with obsolete generic `userId` claims must be
replaced by signing in again.

Invalid tokens or no-longer-valid account/tenant state return **401**; current
users lacking an operation permission receive **403** from controller guards.
Database/configuration/data-resolution failures return a generic **503**, without
SQL, bound values, bearer tokens, or partial permission sets. Authentication
failure responses are `no-store`. `OPTIONS` bypasses authentication/DB resolution.

These checks do not implement per-token/session revocation: password changes alone
or signing out do not revoke existing JWTs, and reactivating an account can make an
unexpired token usable again. A session/version check or denylist is still needed
for those cases. Requests already authorized/in flight are not retroactively
cancelled. Protected routes must register the appropriate JWT filter and enforce
the operation permission before management service calls (an AuditIdentity alone
is not proof of authorization).

## User-management HTTP API

See `user-management-api.md` for tenant/host CRUD routes, required permissions,
Postman payloads, and the migration needed for existing bootstrap host accounts.

## User and group operations

User reads and mutations are scoped to the supplied tenant; empty tenant means
legacy NULL-tenant users and users in the protected default host tenant. Usernames and email addresses are normalized to lowercase.
Duplicate identifiers are checked within the scope (database constraints remain
responsible for concurrent insert races). Passwords are bcrypt-hashed. Updates do
not move a user between tenants or rewrite creation auditing fields.

User creation stamps `created_at`/`created_by_user_id` and the initial modification
fields using `applyCreateAudit`. Updates stamp `last_modified_at` and
`last_modified_by_user_id` without rewriting creation fields. Successful sign-in
also audits the `last_active` update as the signing-in user.

`deleteUser` performs an **audited soft delete**: it sets `is_deleted = true`,
stamps `deleted_at` and `deleted_by_user_id`, updates modification auditing, and
also disables/locks the account. The row and foreign-key references are retained.
The response reports `deleted: true`. Self-deletion is rejected.

Every user query is tenant-scoped and includes `is_deleted = false`, including
list/count, duplicate checks, update/delete lookups, sign-in and permission
resolution. Inactive but non-deleted users remain visible/manageable; sign-in
separately requires active and unlocked status. Deleted users cannot be listed,
edited, deleted again, authenticated, or granted permissions. User list responses
expose `lastModifiedAt`, with `updatedAt` retained as an alias for compatibility.
`Roles` has no soft-delete column; role lookups retain their tenant scope.

`UserGroups` has **no tenant column**. Until the schema supports tenant ownership,
group management and listings are host-only; tenant-scoped requests are rejected
rather than exposing global groups. Groups have validated parent chains (no
cycles), validated host-role references, audit stamping, and soft deletion.
Deleting a parent with live children is rejected. Deleted groups no longer grant
permissions. Group role objects (`{id,name}`) are resolved by ID; role permissions
are only granted when the role tenant matches the user tenant.

## Passkeys — deliberately disabled

Both passkey endpoints respond with HTTP 501 / `ERR_UNSUPPORTED_OPERATION`.
The WIP signature-only verifier had no server-issued, one-use challenge or
origin/RP validation, so a recorded assertion could be replayed to obtain tokens.
It has been removed rather than shipping a bypass. To enable passkeys safely,
implement challenge issuance/storage/consumption, registration and key-format
validation, origin/RP-ID and authenticator flags verification, and atomic sign-count
updates (or integrate a complete WebAuthn library). Password login remains usable.

## Soft-delete query policy

All queries against soft-deletable models in UserService and GlService include
`is_deleted = false`, including duplicate checks and accounting-unit dependency
counts. Deleted records cannot be listed, edited, deleted a second time, or used
as lookup/parent records. Deleted dependencies do not block accounting-unit
deletion. `GlAccountBalances` has no deletion flag, so all balance rows still
protect their accounting unit from deletion. User groups follow the same rule when resolving permissions.

Application duplicate checks now consider only live rows. Non-partial database
unique constraints (for example `(tenant_id, code)` on accounting units) may still
reserve a deleted row's identifier and reject reuse. No constraints are relaxed
by this change, and deleted rows are never restored implicitly.


# Generate TOTP KEY

```bash
openssl rand -hex 32
```

### Tenant-login 503 after regenerating models

The generated `Tenants` model now includes the billing/account-management
`account_version` column (migration 018). Loading the entire generated tenant
model during sign-in or permission resolution couples authentication to that
unrelated schema change. Authentication now uses `utils/TenantAuthLookup.h` to
select only `id`, `tenancy_name`, `name`, and `require_two_factor_auth`, while
requiring `is_active=true` and `is_deleted=false`. The same projection is used
for password login, post-TOTP token issuance, permission resolution, and the
protected host tenant. Generated models are preserved, not downgraded.

Rebuild/restart the C++ API after updating. Apply `018_tenant_accounts.sql` to
its configured database for account-management features; this compatibility
fix does not migrate a database automatically. For a required-MFA tenant,
`004_tenant_totp.sql` and a valid, stable `custom_config.TOTP_KEY` are still
required. Do not disable MFA or regenerate an existing encryption key to work
around a login failure. Direct login still needs valid `JwtBearer` settings.

An HTTP access-log 503 alone does not identify the failed operation. Backend
error logs now include a safe stage (`tenant_lookup`, `user_lookup`,
`password_verification`, `two_factor_challenge`, or `token_and_permissions`)
and whether the failure was database or configuration/processing related.
No submitted password, JWT, TOTP secret/key, SQL parameters, connection string
or raw database exception is written by these diagnostics. Invalid credentials
remain 401; genuine dependency/configuration failures still fail closed.

Regression tests: `test/auth/run_login_pg.sh` exercises the C++ login and token
permission path against a real PostgreSQL tenant table without billing columns,
with the generated-model test path deliberately unavailable. Set
`LOGIN_TEST_DATABASE_URL` to a disposable database, `JSONCPP_SOURCE_DIR` and
`OPENSSL_SOURCE_DIR` to the test dependencies, and `LIBPQ_LIB_DIR` to libpq.
It uses the established synchronous coroutine transport seam, not a deployed
HTTP backend. The existing user/auth suite also covers MFA and live role checks.
