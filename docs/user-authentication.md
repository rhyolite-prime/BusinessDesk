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
Both carry `iss`, `sub`, `iat`, `exp`, optional `aud`, and `permissions` as a
**JSON-encoded string array**, matching the filters' existing parsing contract.
Filters enforce signature, issuer, configured audience, expiry, mandatory identity
claims and permissions shape, and reject opposite-scope claims. Older generic
`userId` tokens must be replaced by signing in again.

Tokens are permission snapshots: account deactivation and permission changes affect
new logins immediately, but already-issued tokens remain valid until expiry.
Immediate revocation would require a session/version check or denylist, not
currently part of the filters. Protected routes must register the appropriate JWT
filter, and callers must enforce their operation's permissions before invoking
management services (an AuditIdentity is not proof of authorization by itself).

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
