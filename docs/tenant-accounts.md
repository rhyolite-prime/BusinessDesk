# Tenant accounts, subscriptions and billing

## Placement and authority
- **Host → Tenants** (`/host/tenants`): search customer tenants and open Overview, Subscriptions, Billing, Security, Requests and Audit history. The installation's protected host tenant is excluded and cannot be suspended/edited here.
- **Account & Subscription** (`/account`): tenant-administrator read-only overview, current module fees/terms and recorded billing method, plus idempotent change requests. Reach it from workspace setup navigation or the module manager's access dialog. Ordinary tenant users get module entitlements only, not commercial/billing details.
- Tenant Preferences remains operational preferences; Company Profile remains business identity. Infrastructure connection strings, account secrets, provider credentials and support-account linkage are never included in these responses or account snapshots. The existing host provisioning API is unchanged; infrastructure changes are not offered through this UI.

Host management requires a live host administrator identity and `tenants.read` / `tenants.update`, or `tenants.manage`, as applicable. Host and tenant session cookies/tokens cannot substitute for each other. APIs recheck live users and tenant scope; tenant-supplied IDs cannot select another account. Tenant users cannot edit fees, module flags, expiry dates, billing profiles or the host's MFA requirement. Existing MFA enrollment/authentication enforces the tenant flag.

## Compatibility and migration
Apply **018_tenant_accounts.sql** after the existing tenant/user/currency schema and migrations through 017, before deploying these account APIs. It adds an account version, billing profiles, append-only account events and change requests. A tenant update trigger also bumps the version for writes through the existing tenant API, avoiding stale new-screen saves after legacy edits.

The fourteen existing module subscription column groups remain on `tenants` as the source of truth for compatibility. This release does not duplicate/migrate those values to a normalized subscription table or invent a pricing plan. Future normalization can be migrated explicitly without disrupting authentication or provisioning.

Billing currency is deliberately **not inferred** from the company's accounting currency. Legacy fees did not specify a billing currency. The host must select an active global currency before saving commercial terms. Changing currency re-denominates the entered fees, not an automatic FX conversion. Fees use nonnegative decimal strings (up to 14 whole and 6 fractional digits), never client-side Number arithmetic.

New billing records do not copy legacy provider identifiers/credentials or treat them as verified payment instructions. `invoice`, `bank_transfer`, `mobile_money`, `card`, and `unconfigured` are administrative labels only. There is no payment gateway, automatic charging, mandate activation or card-entry form. Tenant admins request changes; the host records an agreed method after handling authorization through a trusted provider. Do not place passwords, card details or payment credentials in request text.

`core_tenant_billing_profiles`, `core_tenant_account_events`, and `core_tenant_account_requests` intentionally use the protected `core_tenant_` prefix and are not added to the business reset registry. The existing reset implementation explicitly preserves/excludes that namespace, along with tenants/users/security and company profile. They survive tenant business-data initialization. Ordinary reads always exclude soft-deleted rows. Downgrade is destructive: export billing/audit/request records first.

## Entitlements and rollout — important
**Review existing tenant subscription flags and dates before deploying the updated JWT filter.** A newly provisioned tenant starts with module flags disabled; the host must enable purchased modules. There is no automatic grant to preserve access for an unsubscribed tenant.

The production tenant JWT filter now checks applicable module subscriptions for `/api/v1/ledger`, `/payroll`, `/hr`, `/school`, `/ap`, `/ar`, `/inventory`, `/manufacturing`, `/pos`, `/fixed-assets`, `/supply-chain`, `/property-rentals`, `/document-management`, and `/core-banking`, using exact path-segment boundaries. It requires an active, nondeleted tenant, enabled module, start date ≤ database CURRENT_DATE and end date ≥ CURRENT_DATE. Null dates mean no corresponding date bound. The end date is inclusive. Fees, readiness labels, billing cycles and next-renewal reminders alone do not grant or revoke access; there is no implicit grace period. Dates are calendar dates evaluated in the database timezone.

Module verification is repeated on each authenticated API request; client/JWT permission claims and stale frontend module labels do not grant access. Verification failures fail closed (503), missing/expired subscription returns 403 `subscription_required`. Module checks supplement existing role permissions, not replace them. Authentication, account/billing access, shared setup and preferences stay outside module gating so administrators can manage their account. This enforcement applies to endpoints using `TenantJwtAuthFilter`; future module controllers must attach that filter. Already-authorized in-flight requests are not cancelled retroactively.

The module manager fetches safe live entitlements and changes unavailable workspace actions to “Subscription required”. Catalog-only previews without a legacy subscription field (e.g. Print Intelligence/CRM/Projects) do not receive fabricated entitlements.

## API
All responses use the existing `BaseApiResponse` envelope; Nuxt unwraps `result`, sends the appropriate bearer token and disables caching and automatic mutation retries. Cross-origin mutations are rejected. No demo billing/subscription fallback exists.

- `GET /api/v1/host/tenant-accounts?search=...`: safe register, at most 200 matches; narrow searches beyond that.
- `GET /api/v1/host/tenant-accounts/{tenantId}`: account, latest 100 requests and latest 100 audit events.
- `PUT /api/v1/host/tenant-accounts/{tenantId}`: `{version,name,country,isActive,requireTwoFactorAuth,modules,billing}`. All fourteen module objects are required, containing `{enabled,startDate,endDate,fee,billingCycle,nextRenewalDate}`. Allowed cycles: empty/unconfigured, monthly, quarterly, annually, one_time. Billing: `{currencyId,email,phone,paymentMethod}`. Account ID, audit, effective flags and secrets are server-owned. Invalid/stale requests do not partially change terms.
- `POST /api/v1/host/tenant-accounts/{tenantId}/requests/resolve`: `{id,version,status,response}`; status resolved/rejected. Resolving does not implicitly change subscription terms; apply those with a separately audited account save.
- `GET /api/v1/account`: current tenant admin's own safe account, never an arbitrary client-selected tenant.
- `GET /api/v1/account/entitlements`: every live tenant user can read the boolean module map, without fees or billing data.
- `POST /api/v1/account/requests`: `{requestKey:UUID,message}`; same actor/key/message retries return success without duplicate requests/audit. A reused key with changed content conflicts.

Account update/profile changes and before/after audit snapshots are committed in one transaction. Request resolution and audit are also atomic. Stale account/request versions conflict. Suspension revokes subsequent tenant authentication/module access but leaves the account manageable by the host.

## Tests
- `test/accounts/run_pg.sh`: disposable PostgreSQL, migration apply/down/reapply, native service tests with the established synchronous Drogon SQL seam. Set `ACCOUNT_TEST_DATABASE_URL`, `JSONCPP_SOURCE_DIR`, `LIBPQ_LIB_DIR`; optional `ACCOUNT_TEST_SANITIZERS='-fsanitize=address,undefined -fno-omit-frame-pointer'`. Uses npm pg from `ACCOUNT_TEST_DEPS` (default `/tmp/account-tools`).
- `test/accounts/browser_test.mjs`: built Nuxt and real Chromium against a controlled authenticated backend; host edits, tenant read-only controls, requests/resolution, token forwarding, CSRF rejection and module-manager gating. Not a claim of deployed C++ HTTP end-to-end testing.
- Existing user/auth suite includes production JWT subscription denial, grant, fail-closed and account-route exemption checks.
