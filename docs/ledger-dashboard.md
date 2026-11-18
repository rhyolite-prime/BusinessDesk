# Live General Ledger dashboard

`/ledger` reads authenticated, tenant-scoped PostgreSQL data. There is no demo
fallback, seeded balance, hardcoded accounting unit, default GHS currency, or
fabricated change percentage. Connection/configuration failures display an error;
an empty unit displays zero totals and explicit empty states.

## API and deployment

- `GET /api/v1/ledger/dashboard/options` returns live active accounting units and
  their base currencies/fiscal start months, tenant cost-center hierarchy, and
  transaction currencies/sources actually represented in tenant ledger data
  (unit base currencies are also included).
- `GET /api/v1/ledger/dashboard` requires `accountingUnitId`, `dateFrom` and
  `dateTo`. Optional filters are described below. It returns the applied filters,
  generation timestamp, financial indicators, linked-bank balances, complete
  journal/status/approval counts, the latest ten matching batches, and up to five
  pending batches (oldest first).
- Nuxt proxies these at `/api/ledger/dashboard` and
  `/api/ledger/dashboard/options`. Configure `NUXT_LEDGER_API_BASE_URL`, or use
  the existing `NUXT_AUTH_API_BASE_URL` origin. Requests are server-to-server with
  the session bearer token; browsers use only same-origin `/api` paths. Both
  layers send `Cache-Control: no-store`; errors do not disclose SQL details.
- Deploy/rebuild the C++ API as well as Nuxt. The new controller is protected by
  `TenantJwtAuthFilter`; the service also verifies an active, unlocked tenant
  user. No new database migration or seed is required. Existing ledger and
  cost-center prerequisites, including migration 014's canonical organization
  assignment, must already be deployed.

## Filters

| Parameter | Meaning |
| --- | --- |
| `accountingUnitId` | Required live, active unit UUID in the signed-in tenant. One unit at a time avoids combining different base currencies. Uses the shared ledger unit selection. |
| `dateFrom`, `dateTo` | Required inclusive transaction-date range, valid calendar dates in 1900–2999, with From ≤ Through. Defaults to calendar year to date using today's date. |
| `costCenterId` | Empty = all centers; `unassigned` = no organization assignment; otherwise a live tenant cost-center UUID. Uses `gl_journal_lines.organization_unit_id`. |
| `includeChildCostCenters` | Boolean, default true. Recursive descendant selection is cycle-safe. Unassigned/all selections do not need this switch. |
| `source` | Empty = all; otherwise the exact persisted journal batch `transaction_source`, at most 40 UTF-8 bytes. Display labels are formatted from real codes, not seeded source records. |
| `currencyId` | Empty = all; otherwise the journal line's recorded transaction currency UUID. Financial indicators still use stored base amounts, not unconverted foreign amounts. |
| `status` | Activity only: empty = all, or `draft`, `pending_approval`, `approved`, `posted`, `rejected`, `voided`, `reversed`. Never changes the posted-only financial basis. |

Date shortcuts include month, quarter and calendar year to date, fiscal year to
date using the selected unit's fiscal start month, last full calendar month, and
custom dates. Filters refresh automatically. Reset preserves the unit and clears
other dimensions back to calendar YTD. Invalid filters and in-flight changes hide
the old snapshot. Aborted/late requests cannot replace a newer scope; tenant
changes clear options, filters and results.

Currency and source filters use **recorded journal dimensions**, not heuristics
from account names or voucher descriptions. For example, a foreign voucher that
posts a base-currency journal is represented in that journal's base currency.
The dashboard does not rewrite historical journal sources or posting data.

## Calculation policy

All financial totals exclude deleted batches/lines and use **posted** batches
only, across all recorded transaction sources. PostgreSQL performs the sums in
numeric precision and returns decimal strings; no paged register or recent-entry
sample is used to calculate totals. All sections share a single statement/MVCC
snapshot. There is no 50,000-line client-extract cap.

- **Assets** = base debits − base credits; **liabilities** = base credits − base
  debits, including all matching posted history through Through, regardless of
  From. This retains opening balances and prior-period movement.
- **Revenue** = base credits − base debits; **expenditure** = base debits − base
  credits within From–Through. Batch-level and line-level opening entries are
  excluded from income/expense activity.
- Classification matches financial reports: current live GL AccountType
  (`0` Asset, `1` Liability, `3` Revenue, `4` Expense), with the posted historical
  type retained if the account is unavailable. Unknown/reclassified posted lines
  produce review warnings instead of silent classification guesses.
- **Cash/bank** = transaction debits − transaction credits on GLs linked to a
  non-deleted Bank Account configuration, grouped by recorded currency through
  Through. Inactive bank configurations still retain their historical balance;
  voucher entry, separately, offers only active bank links. `EXISTS` prevents
  duplicate Bank Account links from multiplying one GL balance.
- **Activity/status counts** cover every matching batch, not just the ten-row
  display. A batch matches when it has transaction lines in the date/dimensional
  scope. An empty live batch can match its header date only when no cost-center
  or currency restriction is applied. Displayed debits/credits are sums of the
  matching lines in base currency, labelled accordingly—not unfiltered header
  totals. Dates shown in the table remain the original batch dates.
- **Pending approvals** use a separate full count and limited backlog list,
  independent of the latest ten entries. These are journal batches, not a
  combined voucher approval queue. The topbar also passes the selected unit and
  requests the actual pending list across history through today.

## Verification

```sh
node --experimental-strip-types test/ledger_dashboard/filters_test.mjs
node --experimental-strip-types test/vouchers/bank_gl_options_test.mjs

# Disposable database only; actual service and SQL with the existing ORM transport seam.
DASHBOARD_TEST_DATABASE_URL=postgresql://... \
JSONCPP_SOURCE_DIR=/path/to/jsoncpp \
LIBPQ_LIB_DIR=/path/to/libpq \
  bash test/ledger_dashboard/run_pg.sh

# After a Nuxt production build, with playwright-core + @sparticuz/chromium installed:
DASHBOARD_BROWSER_DEPS=/path/to/browser-tools \
  node --experimental-strip-types test/ledger_dashboard/http_browser_test.mjs
VOUCHER_BROWSER_DEPS=/path/to/browser-tools \
  node --experimental-strip-types test/vouchers/lookups_browser_test.mjs
```

The PostgreSQL suite exercises real ledger migrations and more than 50,000 lines,
exact totals, opening/period distinctions, combined filters, tenant isolation,
archived data, classification warnings and full approval counts. Browser/HTTP
suites use built Nuxt, Chromium and controlled upstream fixtures; they validate
forwarding, all filters, presets, scope races, mobile layout, empty/error states,
no demo fallback and the three voucher types' bank-linked GL selection. They do
not require or modify an application database.
