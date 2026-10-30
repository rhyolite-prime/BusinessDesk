# Live Account Heads CRUD

Open **General Ledger → Account Setup → Account Heads** (`/ledger/account-heads`).
This page no longer reads or mutates workspace demo setup data.

## Configuration and token handling

- Rebuild/restart the C++ backend and Nuxt frontend together.
- Configure `NUXT_LEDGER_API_BASE_URL` with the C++ backend **origin** (for example
  `http://localhost:5004` when both processes run on the same machine). If unset,
  account-head requests use the existing configured auth origin. Containers need
  a server-reachable service hostname, not the browser's localhost.
- Sign in through the tenant login flow. Nuxt reads the HttpOnly JWT cookie,
  validates it with the backend `/api/v1/auth/me`, and forwards **every** unit/list/
  get/create/update/delete request with `Authorization: Bearer <token>`. It never
  puts a token into CRUD bodies, local storage, or browser-facing responses.
- Browser calls use same-origin `/api/ledger/*`; Postman can instead call the
  C++ routes below with its bearer JWT. There is no account-head demo fallback.
- These routes require a live authenticated tenant user and tenant/unit ownership.
  No new operation-specific permission catalog/grants are introduced by this work.

## Accounting-unit scope

Select an active accounting unit owned by the signed-in tenant. If none exist,
create one through the existing accounting-unit API before creating heads. Unit
choices are read from the backend, never from seeded/demo data or a caller's
`tenantId` field. Every record operation verifies the unit belongs to the JWT
identity's tenant and is active/non-deleted. Records, ancestors and dependents
are constrained to the same tenant/unit and `is_deleted = false`.

The page reloads when units change, fetches all pages (200 rows each, display cap
10,000), then provides name/path search and standard-type filtering. Parent
choices exclude the edited head, descendants, inactive heads and other account
types. Edit fetches the current persisted record before opening the form. Type,
active status and root/parent changes are saved through PUT. Errors keep the
form/confirmation open. Successful writes refresh the real list; a failed refresh
shows an error rather than substituting stale demo data.

## Backend API

The account-head paths are now registered exclusively in `AccountHeadController`
with `TenantJwtAuthFilter`. The prior GlController account-head registrations were
removed, avoiding duplicate or unprotected routes. Other GL resource routes and
legacy services are not reworked here.

| Method | Path (under `/api/v1/ledger`) | Purpose |
|---|---|---|
| GET | `/account-head-units` | Active tenant-owned unit choices |
| GET | `/account-heads?accountingUnitId=<uuid>&pageNo=1&pageSize=200&query=` | Paginated live heads |
| GET | `/account-heads/<uuid>?accountingUnitId=<uuid>` | Current head |
| POST | `/account-heads` | Create head |
| PUT | `/account-heads/<uuid>` | Update editable fields |
| DELETE | `/account-heads/<uuid>?accountingUnitId=<uuid>` | Audited soft deletion |

POST and PUT accept only:

```json
{
  "accountingUnitId": "<tenant-owned unit UUID>",
  "name": "Current assets",
  "parentId": null,
  "accountType": 0,
  "isActive": true
}
```

The backend also accepts the original `accountHeadName` and `parentHeadId`
request aliases (not together with their canonical equivalents). Existing callers
must now supply the tenant-owned accounting unit and bearer JWT.

Type codes: Asset **0**, Liability **1**, Equity **2**, Revenue **3**, Expense **4**.
Parent is optional/null for a root. Names are trimmed, required and at most 160
characters. Tenant, audit and privilege fields are rejected. Scope cannot move a
head between tenants or units: a record must already belong to the selected unit.

Backend responses use `{success,result,error}`. Lists have
`result: {data,totalCount,pageNo,pageSize,totalPages}`; records have canonical
`id,name,parentId,accountType,isActive,accountingUnitId`. Nitro unwraps `result`
and preserves validation/auth/not-found/conflict status without leaking SQL or
bound values. Backend create returns 201; the frontend proxy currently returns
200 for successful operations. Failures are 400/401/403/404/409 or generic 503.
All account-head responses are `no-store`; mutations enforce same-origin at Nitro.

The backend rejects self/cyclic/deep parent references, inactive/wrong-type/foreign
parents, duplicate live siblings, type changes with dependents, deactivation with
active dependents, and deletion with live child heads, controls or accounts.
Create/update/delete auditing uses the JWT user; creates set tenant, accounting
unit, active status and explicit `is_deleted = false`. Writes use a transaction
and lock the accounting-unit row, serializing **these account-head writes** within
that unit. Successful responses await commit; commit failure cannot report save
success. Other legacy GL write routes do not yet participate in this lock protocol.
Database unique constraints still apply and may reserve soft-deleted identifiers.

## Tests

- `test/users/run.sh` includes `account_head_service_test.cc`, exercising service
  CRUD, live-record predicates, tenant/unit isolation, hierarchy/status rules,
  dependency rejection, audit stamping, failures and commit-error responses.
  The ORM seam does not simulate real multi-connection locks/rollback.
- Build the frontend, then run
  `node test/ledger/account_heads_http_test.mjs`. It starts the built Nitro app
  against a strict test upstream and checks all six read/write calls carry the
  bearer token, scope and CRUD payloads survive mapping, invalid inputs and
  cross-origin writes fail, and upstream details do not leak.
- `npm --prefix frontend run typecheck` and `npm --prefix frontend run build`.
- C++ sources are syntax-checked against real Drogon 1.9.5/model headers.

These verify the backend service and frontend HTTP boundary separately. A fully
linked live Drogon/PostgreSQL deployment, real browser interaction and concurrent
multi-connection writes still need deployment-level verification.

### Hierarchy presentation

The Account Heads page builds a parent/child tree **after all API pages load**.
API order is not hierarchy order: parents render before their children, and each
subtree stays together. Sibling order follows the existing `sortOrder` values.
Indentation comes from the resulting tree depth, and parent choices use the same
tree order and full paths. Searching retains ancestor rows for matching children;
a parent/path match also includes its descendants. Missing parents and malformed
cycles are handled defensively without hiding records or looping indefinitely.

Regression test: `node test/ledger/account_head_tree_test.mjs` (requires installed
frontend dependencies). Covers interleaved API order, depth, paths, filters,
ancestor context, missing parents, cycles, duplicates, and deep trees.
