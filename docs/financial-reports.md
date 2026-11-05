# General Ledger reports — AccountType only

## Classification and workflow

All reports use the existing `AccountType` enum as their sole classification:

| Value | Classification |
|---|---|
| -1 | Unknown |
| 0 | Asset |
| 1 | Liability |
| 2 | Equity |
| 3 | Revenue |
| 4 | Expense |

No account-name/range heuristics or persisted report mappings are used. Invalid
or unsupported type values are treated as Unknown. Current live chart types are
used; historical unavailable accounts retain their posted identity/type. A type
change between the current chart and posted lines generates a review warning.

`/ledger/reports` is the single rendering page. The grouped Report dropdown
contains Chart of Accounts plus the 15 financial variants below. The sidebar
links to All Reports, not individual report pages. Old financial/chart URLs
redirect here. Switching report/filter invalidates the previous report and
in-flight generation; exports always represent the generated snapshot.

Financial Report Mappings has been removed from the workflow and navigation.
Its old page redirects to All Reports. Its old Nuxt PUT endpoint requires the
usual session/origin checks and responds **410 Gone** without forwarding a write;
the C++ PUT route and service write path are removed. Snapshot reads neither join
mapping tables nor return categories/admin mapping capabilities. Historical
mapping tables, audit rows, ORM models and migration 027 are intentionally retained
for existing deployments, but are not read or modified by reporting. No destructive
migration or manual clearing of data is needed. Mapping tables are not required
for the snapshot query to work.

## Available reports

| Report | Basis |
|---|---|
| Journal Register | Posted transactions grouped by transaction year → month → batch, with base-currency batch/month/year subtotals and grand total. |
| General Ledger / Account Activity | Per-account opening balance before From, chronological activity, running balance and closing balance. |
| Trial Balance | As-of closing debit/credit balances grouped by Asset, Liability, Equity, Revenue, Expense, Unknown. Ends with one bold, underlined GRAND TOTAL row. No control-difference section. |
| Balance Sheet | Broad Assets, Liabilities and Equity only, with cumulative unclosed earnings and an explicit accounting-equation reconciliation. |
| Cost-Center Report | Period posted debit, credit and signed net per center, including unassigned activity. |
| Basic Income Statement | Revenue, Expenses and net income/loss. |
| Budget vs Actual | Actual, approved/closed original or revised budget, difference, percentage and favourable variance. |
| Prior-period Operating Statement | Current period vs the immediately preceding equal day count. |
| Comparative Operating Statement | Current period vs prior-year dates, with leap-day clamping. |
| Expenditure Returns | Expense-account activity; a management report, not a statutory/tax filing. |
| Revenue Statement | Revenue-account activity. |
| Cross-Tab / Cost-Center Comparison | Income/expense activity and net income across centers. |
| Monthly Operating Trends | Income/expense activity and net income across calendar months. |
| Year-to-Date Income Statement | From is replaced by Company Profile's fiscal-year start. |
| Common-Size Income Statement | Income/expense amounts as a percentage of total revenue; N/A if revenue is zero. |

Chart of Accounts retains its original account/control hierarchy and type, status
and search filters. It loads all pages of setup accounts and controls, rather
than posted transactions. Legacy unimplemented Voucher, Imprest, Reconciliation,
Petty Cash and H/W menu items remain disabled “coming soon” dropdown entries.

### Unsupported classifications and subtotals

The enum cannot distinguish current/noncurrent assets or liabilities, cost of
sales vs operating expenses, depreciation, finance costs or income tax. Therefore
current/noncurrent sections, gross profit, detailed operating profit and EBITDA
are not inferred. Multi-step and EBITDA are removed from the dropdown and engine;
old deep links show a notice and a supported-report selector. No replacement
numbers are manufactured from account names, account-number ranges or old mappings.

### Unknown accounts

Unknown accounts remain included in the Trial Balance, ledger and transaction
reports. The Balance Sheet shows their signed debit-minus-credit balances in a
separate Unknown section, excluded from Assets/Liabilities/Equity. Income variants
show a separate full-width Unknown disclosure with signed period activity (and
comparison-period activity when applicable); it is not placed into a month or
percentage column or included in income totals. Statements warn that their totals
may be incomplete. Unknown balances are never plugged into equity, revenue or
expense. Correct the AccountType in the Chart of Accounts when its purpose is known.

## Accounting and display rules

- Only live posted batches and live lines are included; drafts, approved-only,
  voided/unposted entries and archived batches/lines are excluded.
- Financial dates use transaction-date basis. As-of reports include all posted
  history through the selected date. Income excludes opening-balance entries.
- Stored six-decimal monetary strings are calculated with exact BigInt arithmetic,
  not Number. Company Profile controls display precision only (0–6, default 2).
- Revenue is credit-minus-debit; expenses are debit-minus-credit. Net income is
  revenue less expenses. Balance-sheet earnings are cumulative unclosed revenue
  less expenses; assets minus liabilities minus equity minus earnings is disclosed,
  never silently plugged. Equity closing journals must be interpreted accordingly.
- Budget comparisons require complete calendar months, with no daily proration.
  Revised zero is a real value, not a fallback to original. Overlapping approved
  budgets are additive. Revenue favourable variance is actual-minus-budget;
  expense favourable variance is budget-minus-actual.
- Journal subtotals add base debit/credit only; mixed transaction currencies are
  never added together. A batch spanning transaction months appears within each
  applicable month, without duplicating any line.
- Account/Cost Center use the Journal Entry searchable `AccountControlPicker`.
  Catalog choices load before first generation, including all account pages;
  historical snapshot choices are retained. All accounts, All cost centers and
  Unassigned only remain available. Cross-unit directory responses are ignored.
- Selected cost centers appear by name in titles and scope, not UUID. Identifiers
  remain authoritative for filtering, including duplicate names.
- Report dates, ranges, batch dates, as-of headings, monthly column start dates
  and footer dates use **dd-MMM-yyyy**. Calendar grouping labels may say October
  2026. Query/storage dates stay ISO; user-entered descriptions are not rewritten.
- Exchange rates display two decimals using exact half-up rounding; posting,
  transaction rounding, stored precision and calculations are unchanged.
- The printed-on footer uses the accounting unit's timezone and 24-hour hour/minute
  time, e.g. `30-Oct-2026, 12:34`. Invalid legacy zones fall back to UTC. The label
  is frozen with the generated report and shared across preview and all exports.
- All reports use Chart of Accounts font settings. PDF/print, Excel and Word share
  the report model, warnings and complete rows, not just the current preview page.
  Grand-total labels and amounts are always bold and underlined.

## Security, deployment and limits

The authenticated BFF forwards the session bearer token; backend scope derives
from the authenticated tenant/user, never client-supplied tenant or admin fields.
Only active, unlocked tenant users and live active units are accepted. Reads use
one PostgreSQL MVCC JSON snapshot and no-store responses. Errors are sanitized.

Existing ledger, journal, company profile/display-decimal and budget schema
prerequisites still apply. No new migration is required for AccountType-only
reporting. Historical migration 027 remains in upgrade history; it is not a report
configuration prerequisite. This change does not modify the application database.

- More than **50,000** historical posted lines through the date is rejected,
  including when a narrow recent From would otherwise hide earlier history.
- Monthly/cross-tab reports support at most **12** dimensions; excess is rejected,
  not silently omitted.
- Setup listings/picker loading has explicit pagination/capacity guards.
- Cost-center scope can be unbalanced if only one journal side has that center.

## Validation

```sh
npm --prefix frontend run typecheck
npm --prefix frontend run build
node test/reports/financial_reports_test.mjs
node test/reports/report_timestamp_test.mjs
node test/reports/export_test.mjs
node test/ledger/chart_of_accounts_report_test.mjs
node test/ledger/report_export_files_test.mjs
node test/ledger/report_print_test.mjs
```

`test/reports/browser_test.mjs` exercises the built Nuxt app and authenticated BFF
against a controlled upstream in desktop/mobile Chromium, including exports,
filters, redirects, removed variants, retired mapping writes and CSRF. It requires
external temporary Playwright/Chromium dependencies, documented in the script.

`test/reports/run_pg.sh` exercises the real service SQL against disposable PostgreSQL
using a Drogon transport seam. Supply REPORT_TEST_DATABASE_URL,
JSONCPP_SOURCE_DIR and LIBPQ_LIB_DIR (plus the library loader path if needed).
It verifies tenant isolation, posted-only data, exact decimals, budgets, Unknown
types and successful reads with mapping tables absent. Never target production.
Native export test artifacts are written outside Git to `/tmp`.
