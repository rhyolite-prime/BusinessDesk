# Accounting Units

The standalone **Accounting Units** sidebar entry opens `/ledger/accounting-units`.
The page uses live backend data (no demo fallback), with search, pagination, create,
detail loading for edit, activation/deactivation, and confirmed soft deletion.
Account Heads links to this page when no active units are available.

## Authentication and transport

All routes below are registered by `AccountingUnitController` and protected by
`TenantJwtAuthFilter`. Tenant and audit actor come only from verified JWT identity.
Requests must include `Authorization: Bearer <tenant access token>` when calling
Drogon directly. Caller-supplied tenant/audit properties are rejected.

The browser calls same-origin `/api/ledger/...` Nuxt routes. Nuxt verifies the
HttpOnly session and forwards the bearer token to the corresponding backend
`/api/v1/ledger/...` route. Mutations enforce the existing same-origin check;
responses are `no-store`, and database details are not exposed. Configure
`NUXT_LEDGER_API_BASE_URL`, or use the existing `NUXT_AUTH_API_BASE_URL` fallback.

## Backend endpoints

| Method | Path after `/api/v1/ledger` | Result |
| --- | --- | --- |
| GET | `/accounting-unit-currencies` | Active, nondeleted currency catalog: `{id,code,name}[]` |
| GET | `/accounting-units` | `{data,totalCount,pageNo,pageSize,totalPages,...}` |
| GET | `/accounting-units/{id}` | Single tenant-owned, nondeleted unit |
| POST | `/accounting-units` | Created unit (201) |
| PUT | `/accounting-units/{id}` | Updated unit |
| DELETE | `/accounting-units/{id}` | `{id,deleted:true}` |

Backend responses use the standard `{success,result,error}` envelope; Nuxt unwraps
`result`. Lists accept `pageNo` (default 1), `pageSize` (default 20, maximum 200),
and `query` (code/name search). Inactive units remain visible for management;
soft-deleted units are excluded from lists, reads, edits, and deletes.

POST and PUT require the same full editable object:

```json
{
  "code": "HQ",
  "name": "Head office",
  "baseCurrencyId": "a0000000-0000-4000-8000-000000000002",
  "timeZone": "Africa/Accra",
  "fiscalYearStartMonth": 1,
  "isActive": true
}
```

Replace the example currency UUID with an actual active currency catalog ID.
Code/name/time zone are trimmed; backend length limits are 40/160/80 bytes.
Currency must be active and nondeleted. Fiscal month must be an integer 1–12,
active status a boolean, and time zone recognized by PostgreSQL's time-zone
catalog. Nuxt also checks the time zone with `Intl.DateTimeFormat`.

Unit codes are unique within a tenant. The existing database constraint retains
code reservations even after soft deletion. No schema migration is needed.

Writes execute inside a transaction and await commit before reporting success.
Updates/deletes lock the selected tenant-owned live unit. Create/update/delete
stamp audit identity. Delete sets both `isDeleted=true` and `isActive=false`.
Live account heads, controls, accounts, accounting periods, bank accounts, and
any account balances block deletion; the same dependencies prevent base-currency
changes. Deactivation is allowed without deleting existing ledger data and removes
the unit from the active choices for Account Heads. Existing legacy GL writers do
not all acquire this unit lock; these tests do not prove cross-writer concurrency.

Validation returns 400, unauthenticated access 401, unavailable tenant-owned live
records 404, duplicate/dependency conflicts 409, and unavailable database/failed
commit 503. The Nuxt UI displays sanitized errors.

## Verification

- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run build`
- `node test/ledger/account_heads_http_test.mjs` covers both Account Heads and
  Accounting Units through built Nuxt with a strict mock upstream, including
  bearer forwarding on all six unit routes, validation, and origin protection.
- `JSONCPP_SOURCE_DIR=... OPENSSL_SOURCE_DIR=... bash test/users/run.sh` includes
  `accounting_unit_service_test.cc`: CRUD, tenant isolation, live-record filters,
  audit stamping, dependency guards, validation, sanitized failures, and commit
  failure. This uses the ORM seam and real crypto, not live PostgreSQL.
- Changed backend sources were syntax-checked against Drogon 1.9.5 headers.

A running PostgreSQL/Drogon deployment has not been exercised by these tests.
