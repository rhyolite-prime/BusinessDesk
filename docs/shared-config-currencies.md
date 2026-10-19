# Shared config and the global currency catalog

The General Ledger sidebar now has an expandable **Shared config** parent with:

1. Company profile — `/ledger/shared-config/company-profile`
2. Cost Centers — `/ledger/shared-config/cost-centers`
3. Currencies — `/ledger/shared-config/currencies`
4. Banks and branches — `/ledger/shared-config/banks-and-branches`
5. System numbers — `/ledger/shared-config/system-numbers`
6. Default GL Numbers — the existing `/ledger/default-gl-numbers` page, moved
   from its previous standalone menu position (URL and behavior preserved).

Company profile, Cost Centers, Banks and branches, and System numbers currently
have explicit placeholder screens, not mock edit forms. Banks and branches is
intended as a bank header with child branch tables; it is not the existing ledger
Bank Accounts screen. Only Currencies CRUD is implemented in this change.

## Scope decision

`core_currencies` is an existing **global** table without `tenant_id`. Per the
selected policy, host administrators manage it, while tenant users can view the
shared catalog and choose active currencies for their accounting setup. No schema
migration or tenant-specific currency copies are introduced.

The tenant Currencies page is read-only and links to separate host sign-in at
`/host/login`. Host administrators manage the catalog at `/host/currencies`.
Ordinary host users are not granted access merely because they have a host JWT.
`CurrencyService` verifies a live, active `Users.is_host_admin_user=true` row in
addition to `HostJwtAuthFilter`'s signature, scope, account-status and policy checks.
The role cannot be supplied in a request body or browser cookie flag.

## Backend routes

| Method | Path | Authorization |
| --- | --- | --- |
| GET | `/api/v1/shared/currencies` | Tenant JWT; list global nondeleted catalog |
| GET | `/api/v1/shared/currencies/{id}` | Tenant JWT; one nondeleted currency |
| GET | `/api/v1/host/currency-session` | Host JWT + live host-admin verification |
| GET | `/api/v1/host/currencies` | Host JWT + host admin; list |
| GET | `/api/v1/host/currencies/{id}` | Host JWT + host admin; detail |
| POST | `/api/v1/host/currencies` | Host JWT + host admin; create (201) |
| PUT | `/api/v1/host/currencies/{id}` | Host JWT + host admin; replace editable fields |
| DELETE | `/api/v1/host/currencies/{id}` | Host JWT + host admin; audited soft delete |

List query parameters: `pageNo` (default 1), `pageSize` (default 20, max 200),
`query` (code/name search). Result:
`{data,totalCount,pageNo,pageSize,totalPages}`. Inactive records remain visible
for catalog management; soft-deleted records are excluded from all reads/writes.
The existing active currency-choice route used by Accounting Units/Account Details
continues to return only active, nondeleted currencies from this same table.

Standard backend envelope: `{success,result,error}`. Validation=400,
unauthenticated/wrong token scope=401, insufficient host-admin privilege=403,
missing live UUID=404, duplicate/reference conflict=409, DB/commit failure=503.
Other successful operations return 200.

### POST / PUT body

```json
{
  "code": "GHS",
  "name": "Ghana cedi",
  "decimalPlaces": 2,
  "isActive": true
}
```

All four fields are required. Code is trimmed/uppercased and must contain exactly
three ASCII letters; name is trimmed and must contain 1–100 bytes on the backend;
precision must be an integer 0–6; status must be a boolean. Unexpected fields,
including tenant/audit/role overrides, are rejected. The public currency adds `id`.
The existing unique code constraint continues to reserve codes after soft deletion.
No fabricated catalog IDs or hardcoded currency rows are created.

## Browser transport and host sign-in

Nuxt mirrors the catalog routes under `/api/shared/currencies` and
`/api/host/currencies`, unwraps the backend envelope, and forwards bearer tokens on
every upstream request. Host CRUD follows the existing adapter convention of
returning an unwrapped successful body with 200. Tenant mutations are not exposed.
Browser-facing code uses relative URLs only.

Host sign-in posts to `/api/host/login`, which calls the existing backend
`/api/v1/auth/host-login`, then verifies host-admin privilege via the host currency
session endpoint **before** setting a session cookie. Tokens stay in the separate
`bd_host_access` HttpOnly, SameSite=Strict cookie (Secure in production/HTTPS).
Tenant auth still uses `bd_access`. Neither session is treated as the other, and
host sign-in/logout does not overwrite or clear the tenant session. No JWT is
returned in the host login response body or stored in browser local storage.

`/api/host/me` verifies current host-admin status against the backend; route
middleware protects `/host/*` independently of tenant sign-in. `/api/host/logout`
clears the host cookie. Logout does not implement server-side JWT revocation,
consistent with the existing authentication architecture. Host authentication
uses the existing host policy; this does not introduce a new host MFA flow.

All auth/catalog responses use `no-store`; mutations and host sign-in/logout
use the existing origin protection. Errors are sanitized rather than leaking
SQL or credentials. Each host catalog request revalidates the host-admin session,
so backend privilege/status revocation prevents subsequent requests.

Configure `NUXT_AUTH_API_BASE_URL` for host login. Catalog requests use
`NUXT_LEDGER_API_BASE_URL` with the existing auth-origin fallback. Both origins
must address the appropriate services of the same deployment. Restart/rebuild the
frontend and backend together to register the new routes and pages.

## Reference protection and writes

A currency referenced by **any tenant's** live accounting units, exchange rates,
accounts, bank accounts, balances, journals, cash receipts, payment vouchers,
imprests/refunds/retirements/write-offs, petty cash, or FX revaluations cannot be
deleted, deactivated, or have its code/precision changed. Its name can still be
updated. Applicable dependency queries exclude `is_deleted=true`; balances have
no soft-delete field and always protect their currency.

Global catalog writes execute in one transaction. Updates/deletes lock the live
currency row and await commit before reporting success. Create/update/delete
stamp the authenticated host user's audit fields; deletion sets `isDeleted=true`
and `isActive=false` without physically removing the row.

Accounting Unit and Account Detail transactional writes now lock their selected
currency while validating it, serializing those writes against currency catalog
changes. Other legacy financial writers do not all participate in this lock;
full cross-writer concurrency still requires live database verification.

## Verification

- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run build`
- `node test/ledger/currencies_http_test.mjs`: built Nuxt plus strict mock upstream,
  host login/cookie separation, tenant read-only access, all host CRUD operations,
  bearer forwarding, validation, origin protection, privilege revocation, sidebar,
  host route protection and placeholder-page rendering.
- `node test/ledger/account_heads_http_test.mjs`: existing ledger CRUD regressions.
- `node test/ledger/account_head_tree_test.mjs`: hierarchy regression.
- `JSONCPP_SOURCE_DIR=... OPENSSL_SOURCE_DIR=... bash test/users/run.sh`: includes
  `currency_service_test.cc` for host-admin checks, shared scope, validation,
  dependency guards across every currency-reference model, audit/soft deletion,
  and commit failures. Focused tests also passed with AddressSanitizer/UBSan.
- Backend changes syntax-checked against actual Drogon 1.9.5 headers.

Service tests use the ORM seam with real crypto; HTTP tests use a mock upstream.
A live PostgreSQL/Drogon deployment has not been exercised. No commit/push is
implied by these verification commands.
