# Posted-ledger financial reports

## Deployment and entry points

Apply `027_financial_report_mappings.sql` before deploying/restarting the updated
C++ backend and frontend. Prerequisites: existing ledger, cost-center, budget,
journal/organization-unit, tenant-preferences/reset-registry and company display
precision migrations (001, 007, 008, 011, 012, 014, 015, 026 and their prerequisites).
The migration adds account mappings and their audit events, registers both with
the reviewed tenant-reset registry, and adds a posted-line reporting date index.
No balances or historical journals are rewritten. A down migration is supplied;
roll back the application first. New controller sources are picked up by the
existing controller source scan; the service is explicitly added to CMake.

Open **General Ledger → Reports → Financial Reports & Advanced Statements**
(`/ledger/reports/financial`). Existing Operating Statement menu entries now link
to live reports instead of placeholders. **Report Mappings** is alongside them.
Existing Chart of Accounts remains separate and unchanged.

## Implemented reports (17 variants)

| Report | Contents |
| --- | --- |
| Journal Register | Posted batches, source, line date, account, reference/description, transaction currency/rate and original/base debit/credit. Totals are base-currency only. |
| General Ledger / Account Activity | Account opening balance before From, in-period debits/credits, chronological running balance and closing balance. Optional account filter. |
| Trial Balance | Portrait, classic black-and-white closing balances as of the selected date: separate GL number/name columns, underlined account-type headings, right-aligned debit/credit, totals and zero-difference control. |
| Balance Sheet | As-of assets, liabilities and equity, current/noncurrent mapped sections, unclassified sections, cumulative unclosed earnings, and accounting-equation reconciliation. |
| Cost-Center Report | Posted transaction detail grouped by center UUID, including unassigned lines, with debit/credit/net totals. |
| Basic Income Statement | Revenue, expense detail and net income/loss. |
| Multi-step Operating Statement | Operating revenue, COGS, gross profit, operating expenses, D&A, EBIT, other income, finance costs, tax and net income. |
| Budget vs Actual | Actual, original/revised budget, variance, percentage and favorable variance by income/expense account plus net income. |
| Prior-period Operating Statement | Current range against the immediately preceding range of equal inclusive day count. |
| Comparative Operating Statement | Current range against the same dates in the preceding year; leap day clamps to Feb 28. |
| Expenditure Returns | Expense detail and total expenditure; management report, **not** a statutory filing. |
| Revenue Statement | Revenue detail and total revenue. |
| Cross-Tab / Cost-Center Comparison | Income/expense account rows by cost-center UUID (unassigned separately), totals and net income. |
| Monthly Operating Trends | Account activity by calendar month, clipped to the requested dates, plus totals and net income. |
| Year-to-Date | Fiscal-year start (Company Profile first month) through selected date; From is ignored. |
| Common-Size | Income statement and each line as percentage of total revenue. |
| EBITDA | Multi-step statement plus net income + finance costs + income tax + D&A reconciliation and EBITDA margin. Non-GAAP management measure, includes other income, **not cash flow**. |

## Accounting and scope rules

- Source of truth is live `gl_journal_lines` joined to live `gl_journal_batches`
  in status **posted**, with matching tenant/unit IDs on both sides. Includes
  all transaction sources (manual journals, posted vouchers/receipts, etc.), not
  just general journals. Draft/approved-only/deleted entries are not included.
- This is a posted-journal reporting suite, not a reconstruction from mutable
  `gl_account_balances`. Imported beginning balances must exist as posted opening
  journals. Balance reports include opening entries; period income statements
  exclude explicitly flagged opening-balance entries.
- The reporting basis is **line transaction date**, disclosed in every export;
  header batch date is also shown in the register. No timezone conversion of date
  columns is performed. As-of statements include all posted history through the
  selected date. General Ledger opening balances include activity before From.
- Statements aggregate **base** debits/credits. Register transaction amounts
  retain their own currency labels. No cross-currency raw-amount totals are made.
- Raw decimal strings are converted to signed six-decimal `bigint` units, never
  floating-point money. Presentation uses the Company Profile's display decimals
  from the same snapshot. Ratios use integer hundredths of a percent; zero
  denominator displays N/A. Percentage changes use the signed comparison value.
- Asset and expense amounts are debit-normal. Liability/equity/revenue amounts
  are credit-normal. Contra balances keep their signs. Income = revenue − expense.
- Balance Sheet adds **cumulative unclosed revenue less expense** to posted equity
  explicitly. Existing closing journals naturally reduce remaining P&L balances;
  profit is not double-counted using an unrelated retained-earnings plug. A
  nonzero equation difference is shown and warned about, never hidden.
- Cost-center filtering includes only those lines allocated to the chosen UUID;
  unassigned is an explicit option. Such a filtered trial balance/balance sheet
  can legitimately fail to balance when one side lacks that allocation; a warning
  is exported. Accounts are filterable in register/ledger only, not full statements.
- Account classifications use the current live chart. Posted lines belonging to
  deleted/unavailable accounts retain historical identity/type and appear with a
  warning, rather than dropping posted money. Current-vs-historical account-type
  differences and incompatible stored mappings are flagged.
- Monthly budget comparisons require **complete calendar months**. Only live
  details of approved/closed budgets are included. Revised zero means zero, not
  "fall back to original". Explicit original/revised basis is exported. Budget
  amounts are unit-base amounts. Overlapping approved schedules are additive;
  no daily proration or arbitrary budget-version guess is performed. Missing
  budgets are shown as zero with a warning, not fabricated.

## Explicit account classifications

Tenant administrators can assign only categories compatible with the GL type:

- Asset: current asset, noncurrent asset.
- Liability: current liability, noncurrent liability.
- Equity: equity.
- Revenue: operating revenue, other income.
- Expense: cost of sales, operating expense (excluding D&A), depreciation /
  amortization, finance cost, income tax.

Mappings are keyed by tenant, accounting unit and **account UUID**, never by
name/number. Only changed mappings are submitted; empty category unclassifies a
row by soft deletion. Saves are atomic (up to 500 accounts), validate live unit,
user and compatible account type on the backend, serialize against the unit, and
write an audit event with authenticated actor. All tenant users may read reports;
only active, unlocked tenant admins may change classifications. Basic reports
flag unmapped accounts. Multi-step/EBITDA refuse to calculate if an active
income/expense account with period activity is unclassified. Missing
balance-sheet mappings remain explicitly named unclassified sections.

## Snapshot, export and operational limits

`GET /api/v1/ledger/financial-reports?accountingUnitId=<uuid>&through=YYYY-MM-DD`
returns a single PostgreSQL-statement MVCC snapshot: profile precision/fiscal
month, unit currency, current accounts/mappings, posted lines through date, and
approved/closed monthly budgets. UI filters and calculations operate on this
immutable result. Changing filters clears the old report, and late responses
cannot replace newer selections. Generate again after postings or mapping changes.

The existing PDF viewer provides pagination, zoom, print, PDF/Excel/Word exports
and color/monochrome appearance. All formats receive **all snapshot report rows**,
not just the visible PDF page. Filters, base currency, posted-only basis and
warnings are included. Wide reports use landscape PDF/Word/Excel output and
column percentages total 100. Formula-like account descriptions remain literal
strings, not spreadsheet formulas. Artifacts are generated client-side and are
not persisted in Git or on the server.

Operational guardrails are explicit, never silent truncation:

- At most **50,000 posted lines through the selected date** in a snapshot. All
  history is required for trustworthy openings/as-of balances; a later From date
  alone does not reduce that requirement. Larger ledgers need a future
  server-aggregated/paginated extract rather than silently incomplete reports.
- Monthly/cost-center cross-tabs allow at most **12 dimension columns**. Narrow
  the date range or choose a cost center if exceeded.
- Report mappings permit **500 changed accounts per atomic save**.

The Nuxt BFF derives tenant credentials from the session, uses relative URLs,
checks mutation origin, forwards bearer auth, applies no-store and sanitizes
backend errors. The client cannot supply tenant/user/audit IDs. Host sessions
cannot use tenant report APIs. No report query writes ledger balances.

## Validation

- `node test/reports/financial_reports_test.mjs`: all variants, exact money,
  opening/closing balances, reconciliations, comparisons, missing mappings,
  budget basis, date/filter rules and immutable snapshots.
- `test/reports/run_pg.sh`: real PostgreSQL through a coroutine transport seam;
  tenant/unit/user isolation, posted-only/date/delete predicates, exact decimal
  strings, mapping validation/audit/rollback, budget status and capacity limits.
- `node test/reports/export_test.mjs`: actual PDF/Excel/Word generation for every
  variant (51 files in `/tmp`, not the repository), orientation and structure.
- `node test/reports/browser_test.mjs` with browser deps: desktop/mobile report
  generation, precision, downloads, stale-report clearing, mapping save/read-only,
  sanitized failures, authentication and CSRF. The browser uses a controlled
  upstream; native Drogon/real PostgreSQL behavior is tested separately above.
- Existing chart-of-accounts, report export and print regressions remain in place.


### Traditional trial-balance presentation

The trial balance follows the supplied reference: General Ledger # spans the
account-number/name headers; Debit and Credit are right aligned; rows are grouped
in Asset, Liability, Equity, Revenue, Expense order, naturally sorted by account
number. Contra balances stay on their actual debit/credit side. Zero counterparts
show using company precision. The view uses closing balances through **As of**;
From is hidden and ignored (opening/movement detail remains in General Ledger).
Grand totals, company identity, scope and pagination
remain in the report. Trial balance is always monochrome/portrait, independent of
other reports' appearance. All reports use the same font settings as the Chart of Accounts in each output
format (including Roboto for PDF). Reference templates guide layout only, never
font selection. Trial Balance has no separate font assets or font overrides.
Excel retains separate GL-number/name cells with aligned monetary columns.
No ledger calculations or source queries are changed by this presentation.


## Unified General Ledger report page

`/ledger/reports` is the single rendering page for all 18 available reports:
Chart of Accounts and the 17 financial variants above. The **Report** selector
is grouped into Account listings, Ledger activity, Financial statements, and
Income & operating statements. The sidebar now exposes All Reports and Report
Mappings (a configuration screen, not a report). Existing Voucher, Imprest,
Reconciliation, Petty Cash and H/W placeholders remain visible in disabled
“coming soon” dropdown groups; no data or reports are invented for them.

Select a report, accounting unit and relevant filters, then Generate report.
Chart of Accounts offers account type, status and search instead of dates and
cost center, uses the original chart report engine, and fetches **all pages** of
accounts and controls. Changing any filter clears the generated report; generate
again to get a new snapshot. Switching type invalidates pending requests so old
results cannot replace the newly selected report. The selected report type is
reflected in the URL; existing `/ledger/reports/financial?type=…` and
`/ledger/reports/chart-of-accounts` links redirect to the unified page.

Trial Balance finishes with a bold **GRAND TOTAL** row containing the sum of
closing debit balances and the sum of closing credit balances, in the selected
scope and company display precision. It follows any
report notes, so it is the final report row, including PDF/print, Excel and Word.
There is no control-totals/difference section or duplicate grand-total heading.
Totals are never forced equal; an unbalanced scope still produces a warning.
All reports continue using the Chart of Accounts font settings.


### Printed-on footer

Every report uses the Chart of Accounts date/time presentation: `30-Oct-2026,
12:34` (dd-MMM-yyyy date, 24-hour hour/minute time) in the selected accounting unit's timezone.
Financial reports format their server snapshot timestamp before rendering; Chart
of Accounts formats its generation time using the same helper. This immutable
label is shared by the preview, PDF/print, Excel and Word, rather than changing
when an export is downloaded. Raw ISO/database timestamps and fractional seconds
are not displayed. Invalid legacy timezones fall back to UTC; an invalid timestamp
is labelled `Date/time unavailable` rather than breaking report generation.


## Journal Register hierarchy and display conventions

Journal Register is ordered by **transaction year → transaction month → batch**,
with bold batch, month and year subtotals and one grand total. A batch with line
transaction dates in different months appears separately inside each applicable
month; the batch-date label is retained. Subtotals sum base debit/base credit only:
transaction-currency columns stay blank because mixed currencies must not be added.
Account and cost-center filters apply before grouping and subtotal calculations.

Report dates, batch dates, opening/closing dates, comparison ranges, monthly column
start dates, as-of/range headings and footer dates use **dd-MMM-yyyy** (for example,
`03-Oct-2026`). Year/month grouping labels identify calendar periods, such as
`2026` and `October 2026`. Query parameters, native date inputs and stored dates
remain ISO dates. User-entered descriptions/references are not rewritten.
Exchange rates display exactly **two decimal places**, using exact decimal half-up
rounding without changing stored rates, monetary precision or calculations.

Cost center and Account use the same searchable, grouped `AccountControlPicker`
as Journal Entry. Catalog options are available before generating the first
report; all pages of accounting-unit accounts are loaded. Clear options restore
All cost centers / All accounts, and Unassigned only remains available. Historical
accounts and cost centers from the snapshot are retained if absent from current
catalogs. Unit changes clear selections and stale directory requests are ignored.
The selected cost center's name appears in the report title and scope, never its
UUID. This presentation is shared by preview, PDF/print, Excel and Word.
