# Live Chart of Account Controls CRUD

Open **General Ledger → Account Setup → Chart of Account Control** at
`/ledger/account-controls`. Select an active accounting unit. The page loads all
pages of live controls and account heads for that unit, displays the expandable
control hierarchy, and supports search/head filtering, create, detail loading for
edit, activation/deactivation, refresh, and confirmed soft deletion. It no longer
uses the demo setup store or demo account-usage data.

## Authentication and configuration

`AccountControlController` owns the `/api/v1/ledger/account-controls` routes;
the old unfiltered `GlController` registrations for those paths are removed.
Every route uses `TenantJwtAuthFilter`. Tenant and audit actor come exclusively
from verified JWT identity, never a request header/body supplied tenant ID.
The selected accounting unit must be active, nondeleted and owned by that tenant.
All control reads/writes exclude `is_deleted=true` records.

Browser calls use same-origin `/api/ledger/account-controls` Nuxt routes. The BFF
verifies the HttpOnly session and forwards `Authorization: Bearer <access token>`
on every upstream call; no token is exposed to browser code or put in a CRUD body.
Mutations enforce the existing origin check. Responses are `Cache-Control: no-store`.
Set `NUXT_LEDGER_API_BASE_URL` to the backend origin, or use the existing
`NUXT_AUTH_API_BASE_URL` fallback. Rebuild/restart backend and frontend together.
There is no demo fallback.

## Backend API

| Method | Path | Scope and result |
| --- | --- | --- |
| GET | `/api/v1/ledger/account-controls` | Query `accountingUnitId`, optional `pageNo`, `pageSize`, `query` |
| GET | `/api/v1/ledger/account-controls/{id}` | Query `accountingUnitId`; single control |
| POST | `/api/v1/ledger/account-controls` | Full editable object below; created control (201) |
| PUT | `/api/v1/ledger/account-controls/{id}` | Same full editable object; updated control |
| DELETE | `/api/v1/ledger/account-controls/{id}` | Query `accountingUnitId`; `{id,deleted:true}` |

For direct requests, include a tenant bearer token. List defaults: page 1, size 20;
maximum page size 200. `query` searches the control name. Result:
`{data,totalCount,pageNo,pageSize,totalPages}`. The frontend fetches all pages
(up to 10,000 records) before constructing the tree and parent choices, avoiding
missing parents across page boundaries. Search in the frontend also matches
ranges and head/parent paths, retaining ancestor context.

Backend responses use `{success,result,error}`; Nuxt unwraps `result`.
Successful reads/updates/deletes return 200. Backend create returns 201 (Nuxt's
existing adapter convention returns the unwrapped payload with 200). Validation
returns 400, unauthenticated access 401, unavailable scoped records 404,
business/unique conflicts 409, database/commit failure 503. Internal database
messages are not returned to the client.

### POST / PUT example

Replace both scope IDs with real IDs from your tenant:

```json
{
  "accountingUnitId": "a0000000-0000-4000-8000-000000000001",
  "accountGroupId": "b0000000-0000-4000-8000-000000000001",
  "parentAccountHeaderId": null,
  "accountHeaderName": "Cash and bank",
  "minAccount": 1000,
  "maxAccount": 1999,
  "isActive": true
}
```

The public control adds `id`. The parent is optional/null for a root. Other fields
are required. Unexpected fields (including tenant, role, privilege, and audit
fields) are rejected. `accountHeaderName` is trimmed and limited to 160 bytes on
the backend. Ranges must be integers from 0 through 2147483647 with min ≤ max.
The active flag must be a boolean, not a string.

## Business rules

- Head must be active, nondeleted and in the same tenant/accounting unit.
- Parent must be active, live and under that same head/unit. Child ranges must
  fit inside their ancestor ranges. Self-parenting, cycles and ancestor chains
  exceeding 64 are rejected.
- Live sibling names are case-insensitively unique and inclusive number ranges
  cannot overlap. This includes inactive, nondeleted siblings.
- A control with existing live ledger accounts cannot gain child controls.
- Controls with live children/accounts cannot move to another account head.
- A range cannot shrink around existing live child ranges or account numbers.
- Active child controls or active linked accounts block deactivation.
- Any live child control or linked account blocks deletion. Soft-deleted
  dependencies do not block it. Backend dependency checks are authoritative;
  the UI can disable deletion for known child controls, but does not trust demo
  ledger account data to decide whether deletion is safe.
- Delete sets `isDeleted=true` and `isActive=false` and stamps update/delete audit.
  Creates/updates stamp the authenticated actor and tenant.

Writes use one transaction, lock the tenant-owned accounting-unit row (the same
lock used by Account Heads/Accounting Units), and await commit before reporting
success. Failures roll back. Existing legacy account-detail writers do not all
participate in this lock, so cross-writer concurrency still requires live database
verification. This change does not migrate the Account Details screen to live
CRUD or introduce operation-specific permission grants.

## Verification

- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run build`
- `node test/ledger/account_heads_http_test.mjs`: built Nuxt plus a strict mock
  upstream, covering all setup routes including control CRUD, token forwarding,
  unit scope, input validation, sanitized conflicts, and origin protection.
- `node test/ledger/account_head_tree_test.mjs`: Account Heads tree regression.
- `JSONCPP_SOURCE_DIR=... OPENSSL_SOURCE_DIR=... bash test/users/run.sh`: includes
  `account_control_service_test.cc` covering CRUD, tenant/unit isolation, live-row
  predicates, auditing, range/hierarchy/dependency validation, and commit failures.
- Changed backend sources syntax-checked with actual Drogon 1.9.5 headers.

The service tests use the ORM seam with real crypto; HTTP tests use a mock
upstream. No live PostgreSQL/Drogon deployment has been exercised by these tests.
