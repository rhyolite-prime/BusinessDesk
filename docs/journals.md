# Persisted local and multi-currency journals

## Deploy the database upgrade first

Apply **`database/migrations/012_journals.sql`**, not its `.down.sql`, against the
same database/schema/search path used by the backend. Apply prior feature
migrations first, including the real cost-center catalog (`007_cost_centers.sql`).
Then rebuild/restart the backend and frontend.

```sh
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f database/migrations/012_journals.sql
```

The backend does not run schema DDL on startup or per request. Missing migration
readiness returns `schema_not_ready` / 503; the page identifies migration 012.
Checks are not cached; applying the upgrade repairs the next request. Migration
012 adds optimistic header versions and live line positions. It also fixes the
original NULLS NOT DISTINCT idempotency constraint, which incorrectly allowed
only one null-key journal per tenant/unit. Legacy live line order is backfilled
deterministically by creation timestamp/UUID; financial values are not rewritten.

The down migration reverses this upgrade; it is **not** a repair script. It fails
transactionally if multiple null-key journals violate the original constraint.
No history is automatically discarded to force downgrade. If a SQL tool reports
`25P02`, run `ROLLBACK;` in that session and inspect the first preceding error.

## Routes and authentication

All routes require `TenantJwtAuthFilter`, a live tenant/user and an active,
nondeleted tenant-owned accounting unit. Tenant and audit actor come from JWT
identity, not the request. Host authentication is not tenant authorization.
There is no new journal-specific role policy.

| Method | Backend route | Request / result |
| --- | --- | --- |
| GET | `/api/v1/ledger/journals` | Query `accountingUnitId`; `{items,total}` with complete live lines |
| GET | `/api/v1/ledger/journals/options` | Same query; real base currency, eligible accounts, active currencies, tenant cost centers, open periods |
| GET | `/api/v1/ledger/journals/next-number` | Same query; unreserved number preview (`reserved:false`) |
| GET | `/api/v1/ledger/journals/{id}` | Same query; full record, totals, status, version |
| POST | `/api/v1/ledger/journals` | Full draft input; create (201) |
| PUT | `/api/v1/ledger/journals/{id}` | Full draft input plus current `version`; replace live header/line set |
| DELETE | `/api/v1/ledger/journals/{id}` | Query `accountingUnitId` and current `version`; draft soft delete |
| POST | `/api/v1/ledger/journals/validate` | Full draft input; authoritative validation/totals, no writes |
| POST | `/api/v1/ledger/journals/{id}/post` | Body `{accountingUnitId,version,periodId}`; final atomic posting |

The old unfiltered `GlController` journal-validation registration is removed;
`JournalController` owns it. Routes operate only on `general_journal` source
batches; voucher/receipt/system-generated batches are not editable through this
API. Other statuses remain readable but only `draft` may change.

Same-origin Nuxt routes mirror these under `/api/ledger/journals`. The BFF
unwraps `{success,result,error}` and returns successful results as 200. Every
lookup, read, validation, mutation and posting call forwards the session bearer;
HttpOnly tokens stay server-side. Requests use no-store, no automatic retries,
mutation-origin checks and sanitized errors, with no demo fallback when the
upstream is absent. Existing ledger/auth upstream configuration is reused.

Errors: validation 400, unauthorized 401, forbidden 403, missing/deleted/out-of-
scope record or inactive unit 404, stale version/non-draft/number/period conflict
409, approval-required 409, migration/DB/commit failures 503. Server-generated
numbers, scope, status, names, base amounts, audit fields and deletion flags
cannot be supplied as write properties.

## Input and monetary semantics

Example local draft (replace all UUIDs with real catalog IDs):

```json
{
  "accountingUnitId": "30000000-0000-4000-8000-000000000001",
  "batchDate": "2026-10-20",
  "description": "Capital introduced",
  "isMultiCurrency": false,
  "periodId": null,
  "lines": [
    {
      "accountId": "50000000-0000-4000-8000-000000000001",
      "currencyId": "40000000-0000-4000-8000-000000000001",
      "exchangeRate": "1", "debit": "100.123456", "credit": "0",
      "transactionDate": "2026-10-20", "referenceNumber": "CAP-1",
      "description": "Cash introduced", "chequeNumber": "", "costCenterId": null
    },
    {
      "accountId": "50000000-0000-4000-8000-000000000002",
      "currencyId": "40000000-0000-4000-8000-000000000001",
      "exchangeRate": "1", "debit": "0", "credit": "100.123456",
      "transactionDate": "2026-10-20", "referenceNumber": "CAP-1",
      "description": "Capital", "chequeNumber": "", "costCenterId": null
    }
  ]
}
```

- Use 2–500 valid lines. Drafts may be unbalanced, but invalid/incomplete lines
  cannot be saved. Each line has **exactly one positive side**, not both/zero.
- Dates are real ISO calendar dates, years 1900–2999. Header description is
  required (200-byte limit); optional line description 300 bytes, reference and
  cheque 40 bytes. The editor identifies invalid fields by line number.
- `debit`/`credit` are **transaction-currency** decimal strings, maximum 14 integer
  and 6 fractional digits (`numeric(20,6)`). `exchangeRate` is a positive decimal
  string with at most 10 integer and 10 fractional digits (`numeric(20,10)`).
  JSON numeric amounts, negatives, exponent notation and silent coercions are
  rejected. The editor canonicalizes valid string inputs before submission.
- A rate means **one unit of transaction currency × rate = base currency**.
  Base debit/credit are independently rounded half up to 6 places. Backend math
  and sums use PostgreSQL `numeric`; preview math uses scaled BigInt, not binary
  floating point. Converted lines and batch totals must fit numeric(20,6);
  positive amounts that convert to zero are rejected.
- Local mode permits only the selected unit's base currency at rate 1. In multi-
  currency mode, a line uses its GL account's configured currency, or the unit's
  base currency when the account has no explicit currency. Base-currency rates
  must still equal 1. Foreign rates must be explicitly entered: no fixed GHS,
  mock currencies, fabricated rates or FX-rate feed are used.
- GL accounts must be live, active, manual-postable, non-control and in this
  tenant/unit. Currencies must be live/active in the global catalog. Optional
  cost centers must be live and tenant-owned. Catalog names and account types
  are derived server-side, not trusted from the browser.
- The organizational-unit registry is not connected. New assignments are not
  accepted; no demo organizational IDs are persisted. Retained legacy lines
  preserve their existing organizational ID/name. Newly added lines are
  unassigned. To preserve a line, include its read-only `id` in PUT; it must be
  a unique live line of this same draft. New lines omit `id`. Omitted existing
  lines are audited soft deletes; deleted rows are never restored or updated.
- PUT is a full draft replacement, not a sparse patch. It requires the current
  integer `version`; update/post/delete reject stale drafts rather than
  overwriting another user's changes. Retained line IDs and creation audit
  survive edits/reordering. Soft-deleted history keeps its old position.

## Numbering, final posting and safeguards

The server allocates a number from `gl_journal_batch_sequences` within the same
transaction as creation. The default is `GJ-` plus an eight-digit counter,
monotonic within the accounting unit (not reset annually); existing live sequence
prefix/suffix/increment are respected. GET preview does not reserve/consume a
number. Sequence failures/collisions roll back creation; numbers remain reserved
after deletion. Deleted/exhausted sequences require operator repair, not silent
resurrection. Batch numbers cannot be edited. POST creation has no client retry
idempotency key in this API; after a lost response refresh before creating again.

Draft create/edit/delete do not change balances. Final posting:

1. Locks the unit and batch and checks the current draft version. Accounts,
   currencies and cost centers are locked/revalidated in stable resource order.
2. Recalculates persisted line values at the stored rates, requires positive,
   exactly equal base debit/credit totals (no rounding plug or tolerance).
3. Requires a live, open period in this unit covering **both** the batch and every
   line's transaction date. It locks the period; no automatic period creation.
   Configure periods through your existing administration/database process.
4. Refuses to bypass any active `journal`/`general_journal` approval policy whose
   minimum amount applies. Submission/approval workflow is not added in this
   CRUD implementation. Pending/approved/etc. records remain read-only here.
5. Groups and updates base and transaction-currency balances by tenant/unit,
   account, organization, cost center and currency. Balance buy/sell rates are
   the transaction-amount-weighted recorded rates for the latest posted group,
   not a replacement for a valuation/revaluation engine. Balance overflow rolls
   back the whole posting.
6. Appends a journal-history snapshot and stamps posting/audit fields, marks the
   header posted, and awaits the transaction commit before returning success.

A repeat post of an already posted journal returns that record without touching
balances/history again. Version checks, status checks and cooperating unit locks
serialize posting/edit/delete races. Reconciled/consolidated or non-voided bank-
reconciliation-referenced draft lines cannot be changed/deleted/posted again.
No reversal/unposting operation is introduced; posted journals are immutable in
these routes. All soft-deletable queries/mutations filter live scoped rows;
reconciliation, balance and approval-policy tables without soft-delete fields
retain their native lifecycle rules.

The page now supports live unit selection, search/status filtering, full line
expansion, create/edit/cancel/view, draft delete and confirmed final posting.
Local/multi mode, GL/cost-center selection, dates, references and exact previews
are connected to real lookups. Loading/failure states never fall back to mock
records. Journal mock seeds, fake numbering, test-scenario buttons, hardcoded
rates and fake organizational assignments have been removed. Unrelated demo
metrics/account fixtures in other modules are outside this journal change;
the legacy demo dashboard no longer emits fabricated recent journals.

## Verification

```sh
npm --prefix frontend run typecheck
npm --prefix frontend run build
JOURNAL_TEST_DATABASE_URL='...' JSONCPP_SOURCE_DIR='...' LIBPQ_LIB_DIR='...' \
  bash test/journals/run_pg.sh
JOURNAL_BROWSER_DEPS='path-to-playwright-core-and-@sparticuz/chromium' \
  node --experimental-strip-types test/ledger/journals_http_test.mjs
```

The PG suite requires a **disposable PostgreSQL database** and creates/drops
`journal_test`. Optional sanitizer flags:
`JOURNAL_TEST_SANITIZERS='-fsanitize=address,undefined -fno-omit-frame-pointer -g'`.
It runs production service code/real SQL, with a synchronous libpq/coroutine
transport seam: migrations, scoped CRUD, sequence allocation, stale versions,
exact FX conversion, balance/history posting, rollback injection, repeated-post
protection, processed lines, approval policy enforcement and a competing NOWAIT
connection. Browser tests use built Nuxt and real Chromium with a strict mock
upstream, not a live Drogon/JWT backend. Node 22+ is required for TS imports in
that test. Platform Chromium libraries may require `LD_LIBRARY_PATH`.

The service/controller also pass syntax checks against actual Drogon 1.9.5,
Trantor and JsonCpp headers; no full backend link/live deployment is claimed.
