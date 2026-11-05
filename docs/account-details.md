# Live Chart of Account Details CRUD

Open **General Ledger → Account Setup → Chart of Account Detail** at
`/ledger/accounts`. Select an active accounting unit. The page now loads live
accounts, account heads, control headers, and currencies rather than demo rows.
It supports create, detail loading for edit, activation/deactivation, posting
flags, search/status filtering, refresh, and confirmed soft deletion.

## Routes and authentication

`AccountDetailController` replaces the old unfiltered `GlController` registrations
for these paths. Every route requires `TenantJwtAuthFilter` and a tenant bearer
JWT. Tenant and audit actor come from verified claims; client-supplied tenant,
role, privilege, audit, head, and account-type overrides are rejected.

| Method | Backend path | Scope / result |
| --- | --- | --- |
| GET | `/api/v1/ledger/accounts` | Query `accountingUnitId`, optional `pageNo`, `pageSize`, `query`; paginated accounts |
| GET | `/api/v1/ledger/accounts/{id}` | Query `accountingUnitId`; single account |
| POST | `/api/v1/ledger/accounts` | Full editable object; created account (201) |
| PUT | `/api/v1/ledger/accounts/{id}` | Full editable object; updated account |
| DELETE | `/api/v1/ledger/accounts/{id}` | Query `accountingUnitId`; `{id,deleted:true}` |

The accounting unit must be active, nondeleted, and tenant-owned. Account
reads, updates, deletes, and ordinary duplicate checks all require
`is_deleted=false`. Inactive accounts remain visible for management.
Lists default to page 1, size 20, with size capped at 200. Search matches account
number/name. The result is `{data,totalCount,pageNo,pageSize,totalPages}`.
The UI fetches all pages (up to 10,000 records) before local search/filtering and
loads control/head choices across page boundaries.

Backend responses use `{success,result,error}`. The same-origin Nuxt
`/api/ledger/accounts` BFF verifies the HttpOnly session, forwards the JWT as a
bearer header on every upstream request, and unwraps `result`. There is no demo
fallback. Mutations enforce the existing origin check; responses are `no-store`.
Nuxt retains `/accounts/{id}` PATCH as a compatibility method that validates the
**same full object** and forwards PUT; it is not a partial-field patch.

Configure `NUXT_LEDGER_API_BASE_URL` to the backend origin, or use the existing
`NUXT_AUTH_API_BASE_URL` fallback. Rebuild/restart both applications together.

## POST / PUT example

Replace scope/control/currency UUIDs with real IDs in your database:

```json
{
  "accountingUnitId": "a0000000-0000-4000-8000-000000000001",
  "accountHeaderId": "c0000000-0000-4000-8000-000000000001",
  "accountNumber": "1150",
  "accountName": "Software sales",
  "currencyId": null,
  "status": "active",
  "allowManualPosting": true,
  "isControlAccount": false
}
```

- `accountNumber` is a trimmed digits-only string, at most 80 bytes, whose numeric
  value must fit 0–2147483647 and the control's inclusive range. Leading zeros
  are normalized. Live legacy leading-zero aliases are also checked.
- `accountName` is trimmed and must contain 1–200 bytes on the backend.
- `status` must be `active` or `inactive`; both posting flags must be booleans.
- `currencyId` may be omitted/null to resolve to the accounting unit's real base
  currency. An explicit currency must be an active, nondeleted catalog UUID.
  New/updated records store the resolved currency UUID, never a made-up code.
- Control must be active and nondeleted in the same tenant/unit, have no live
  child controls (even inactive children make it non-leaf), and belong to an
  active, live head in that same tenant/unit. Head and standard type are derived
  from that relationship, not trusted from the client.

The public account contains the editable fields plus `id`, `accountGroupId`, and
integer `accountType` (Asset=0, Liability=1, Equity=2, Revenue=3, Expense=4).
The existing database unique constraint reserves exact account numbers even on
soft-deleted records. No migration is required.

## Reference protection and audit

Writes use one transaction and lock the tenant-owned accounting-unit row shared
with Account Heads/Controls/Accounting Units. Successful responses await commit;
validation/business failures roll back. Create/update/delete stamp the verified
audit identity. No dependency queries run against an empty, not-yet-created ID.

Deletion is blocked by live references in bank accounts, budgets, default GL
configuration, journal lines/deleted-journal records, cash receipt lines,
payment vouchers/lines/retentions, imprests/refunds/retirement lines/write-offs,
petty-cash headers/lines, FX revaluation lines, or any account balances. All
applicable account-reference columns are checked, including debit/credit fields;
references with `is_deleted=true` are excluded where the model supports it.
Balances do not have a soft-delete field and always protect their account.

Used accounts cannot change number, control, head/type, currency, or
control-account classification. Name, active/inactive status, and manual-posting
permission remain editable. Unreferenced deletion sets `isDeleted=true` and
`status=inactive`, retaining the physical record and audit history.

Validation returns 400, unauthenticated access 401, unavailable scoped records
404, duplicate/reserved-number/reference conflicts 409, and database/commit
failure 503. Nuxt presents sanitized messages, not internal SQL.

## Balances and existing ledger consumers

This is a setup CRUD API, not a trial-balance/reporting endpoint. The new page
explicitly says balances are not provided and does not show fabricated zeros,
demo balances, or an incorrect first-account currency as the unit base currency.

`useLedgerApi.accounts()` adapts live details to the older account-picker shape
for other ledger screens. Callers must pass `accountingUnitId`, or first select a
unit on Chart of Account Details (shared Nuxt state for that navigation session).
It fails explicitly when no unit is selected; it never silently chooses another
unit or returns demo accounts. It resolves head labels/currency codes from live
catalogs and leaves unavailable balances blank. Accounts with an unavailable
currency are excluded from these older pickers rather than given a fake code.
This does not migrate journal, bank, budget, imprest, or petty-cash writes to live
CRUD, nor persist a selected unit across a full browser reload.

## Verification and limits

- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run build`
- `node test/ledger/account_heads_http_test.mjs`: built Nuxt with a strict mock
  upstream; includes account CRUD, full-object PATCH forwarding, token forwarding,
  scope, input validation, origin protection, and sanitized conflicts.
- `node test/ledger/account_head_tree_test.mjs`: Account Heads hierarchy regression.
- `JSONCPP_SOURCE_DIR=... OPENSSL_SOURCE_DIR=... bash test/users/run.sh`: includes
  Account Details service tests, every reference-model guard, live-row predicates,
  tenant/unit isolation, inherited nonzero type, validation, audit, and commit
  failures. The ORM seam rejects empty UUID query parameters.
- Changed backend sources syntax-checked against Drogon 1.9.5 headers; the focused
  details service suite also passed with AddressSanitizer during development.

Tests use the ORM seam/real crypto and a mock HTTP upstream, not a live PostgreSQL
Drogon deployment. Real multi-connection concurrency and posting integration
remain unverified. Other legacy financial writers do not all acquire the shared
unit lock. No operation-specific permission catalog/grants are introduced.
