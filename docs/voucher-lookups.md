# Voucher entry: live lookup wiring

The supplier-payment, employee-payment and customer-receipt editors under
`/ledger/vouchers/new/` read tenant-authenticated catalogs rather than payee,
bank, currency, organization and account fixtures. The header Bank GL restriction
requires no new migration; deploy each voucher type's existing persistence and
payee migrations as described in [Voucher posting](supplier-voucher-posting.md).

- Accounting unit: active `/api/ledger/accounting-units` records; unit base currency
  is authoritative for conversion and all local-currency labels (not fixed GHS).
- Supplier: live `/api/shared/suppliers`, traversing pagination, excluding inactive
  suppliers and restricting choices to their posting unit. Selecting a supplier
  defaults the empty debit allocation to its configured AP liability GL and uses
  its catalog currency. Existing entered allocations are not overwritten.
- Bank/cash GL: on **supplier payment, employee payment and customer receipt**
  headers, only eligible active base-currency GLs with at least one **active linked
  Bank Account in the selected accounting unit** are offered. GL and bank catalogs
  are intersected by their real `accountId`, not account names or directory IDs;
  duplicate bank links do not duplicate a GL choice. Inactive, unlinked and
  out-of-unit links are excluded. A sole matching bank record is selected
  automatically; multiple linked records retain the bank-account selector and
  a draft's selected link survives catalog reloads. An empty intersection displays
  a Bank Accounts configuration prompt and blocks
  saving—never falls back to the full chart. Drafts with unavailable bank GLs
  must be corrected before saving. Server-side linked-bank validation remains
  authoritative for preview/save/post.
- Debit/credit allocation, withholding and retention GLs retain their existing
  active chart-of-account choices from
  `/api/ledger/accounts?accountingUnitId=...`, traversing pagination. The bank
  restriction applies only to the voucher header, not every GL field.
- Currency: active global catalog `/api/shared/currencies`, with paging.
- Organizational unit: tenant cost centers from `/api/shared/cost-centers`, with
  hierarchy paths and no default demo organization. Empty selection is allowed.

### Searchable voucher fields

All three voucher forms reuse Journal Entry's `AccountControlPicker` for their
payee (**Supplier / payee**, **Employee / payee** or **Customer**), **Bank / cash
G/L**, each allocation G/L and each **Organizational unit**. The allocation is
called **Debit G/L** on payments and **Credit G/L** on customer receipts. The
supplier form also uses it for **Income withholding credit account** and **VAT
withholding credit account**; other tax and retention controls are unchanged.
Search matches payee names and supplier/customer numbers or employee identifiers,
GL number/name, and organization hierarchy. Keyboard navigation, Enter selection,
Escape dismissal, selected labels and empty-result messages use the shared
picker behavior.

Picker labels are visually hidden by default while retaining accessible names.
Use `show-label` to opt into visible labels, as the voucher header, journal,
setup screens and report filters do. The voucher line table and withholding tax
cards rely on their column or card headings instead of repeating labels.

Existing authenticated, fully paginated catalogs and accounting-unit scope are
unchanged. Supplier selection still defaults an empty allocation and currency;
customer selection still sets the mapped receivable and currency across all
receipt rows. Bank selection still resolves the linked bank record, and allocation
choices exclude the selected bank GL. Receipt rows must still use the customer's
receivable and share one organization; new rows inherit those values.
Organizational unit remains optional with **No unit** to clear; from the search
field, Shift+Tab reaches that choice and Enter selects it. Changing accounting
unit clears dependent selections. Pickers are disabled while loading/saving, on
lookup failure, and for non-draft vouchers; the supplier withholding credit
account pickers also remain disabled until their respective tax is enabled. Saved
drafts restore their selections and unavailable saved values require replacement.
Table-cell menus float in a viewport-positioned overlay outside the table, so
opening them does not stretch rows or get clipped by the horizontal scroll
container. Menus fit the viewport, open above when needed, and track scrolling
and resizing.

Every existing proxy verifies the session and forwards its bearer token. Lookup
failures are displayed with Retry, selections remain empty and saving is blocked;
there is no demo fallback. Account lists reset when scope changes. Tenant/session
changes clear catalogs, draft fields and pending quote responses.

The authenticated `/api/ledger/vouchers/exchange-rate` route reuses the journal
quote policy: an indicative daily foreign-to-base quote, date and provider label;
base-to-base is exactly one. Quotes are not historical payment-date guarantees:
the UI explicitly asks the operator to verify the rate for the payment date.
Failures clear the unrelated old rate and offer manual entry, never hardcoded
USD/EUR/GBP rates. Stale requests cannot overwrite a different currency, and late
responses cannot overwrite a rate already entered manually. Money conversion
continues to use the existing fixed-point BigInt helpers.

All voucher entry forms display exchange rates to **four decimal places**, with
exact half-up rounding. Manual entries accept at most four fractional digits;
excess precision is rounded, including pasted values. Invalid syntax is rejected,
and blur pads valid values to four decimals. Fetched rates and saved drafts retain
their full precision for calculation and saving until the user edits the rate;
merely opening, focusing or saving a draft does not round its stored value. The
base-currency rate displays `1.0000`. No storage or posting precision is changed.

Description suggestions include workflow, payee, payment mode/date, transaction
currency/amount and unique invoice/reference keywords, capped at 300 characters.
Automatic suggestions update while untouched. A manual description is preserved;
**Use suggested description** explicitly replaces it. Existing draft descriptions
are not automatically rewritten.

These entry lookups and rate suggestions use the **existing voucher save/edit
transport**. The Bank GL restriction does not change posting or approval rules.
Deploy the configured voucher API and its existing feature migrations; frontend
lookup wiring alone does not deploy the save/approve/post endpoints. Employee
and customer payee behavior is described below.

Verification:

```sh
npm --prefix frontend run typecheck
npm --prefix frontend run build
node --experimental-strip-types test/vouchers/description_test.mjs
node --experimental-strip-types test/vouchers/rate_input_test.mjs
node --experimental-strip-types test/vouchers/bank_gl_options_test.mjs
VOUCHER_BROWSER_DEPS=/path/to/playwright-core-and-@sparticuz/chromium \
  node test/vouchers/lookups_browser_test.mjs
```

Browser tests use built Nuxt, real Chromium and controlled upstream fixtures;
foreign quote responses are intercepted to avoid live-provider/network dependency.
They verify searchable supplier, employee and customer pickers, keyboard clearing,
mobile table overlays, paginated and scoped choices, bank and receivable defaults,
draft restoration, disabled/error states and saved IDs. They also cover base-rate
routing, bearer forwarding, descriptions, manual overrides, quote failure and no
fabricated fallback. They do not claim a live C++ voucher posting integration.

## Employee payment form

Employee payment vouchers now load payees from the authenticated, tenant-scoped
`/api/shared/employees/options` BFF (`/api/v1/shared/employees/options` in C++).
The form uses only the minimal UUID, employee identifier, name and status
projection—not restricted personal/medical biodata. It follows `totalCount`
pagination (100 rows per page, up to 10,000 rows) and displays no hardcoded/demo
employee fallback. Failed loads clear employee choices; stale tenant/accounting
unit requests cannot replace the current options. No status-code meanings are
assumed because the EmployeeStatus enum has not been supplied.

Employee forms have no retention editor, retention total card, retention credit
preview lines, or retention deductions. Their payload has `retentions: []`, even
when hydrating an old draft containing retentions. Supplier forms retain their
existing tax/withholding/retention functionality.

Employee lines show independent **Imprest ?** (`isImprest`) and **Withhold?**
(`isWithhold`) checkboxes, each with a distinct accessible label. New employee
payloads carry both booleans; other voucher types omit `isImprest`. Older
employee drafts without `isImprest` interpret their legacy `isWithhold` value as
Imprest only, starting the new withholding flag unchecked.

Employee vouchers now use the same authenticated `/api/v1/ledger/vouchers`
CRUD/preview/submit/approve/post endpoints and transactional service as supplier
payments. Payees are validated against live `hr_employee_biodata` rows in the
actor's tenant; names are derived on the server. The database stores employee
links separately from supplier links and persists `has_imprest` independently
from `withhold`. Employee retentions are rejected server-side, not just hidden.

The supplied `templates/EmployeePaymentVouchers.cshtml` and
`templates/employee-payment-voucher.js` provide the employee form and journal
mapping: debit each allocation gross; credit the bank net and the two applicable
withholding accounts. Withhold-marked rows use inclusive tax extraction; plain
rows remain untaxed regardless of Imprest. NHIL/GETFund/VAT/CST/COVID and income/
VAT withholding use the shared fixed-point calculation, additive inclusive
rates, CST/COVID mutual exclusion, and half-up per-row two-decimal rounding.
This retains the existing corrected supplier math rather than copying the
legacy JS omission of CST/COVID from its breakdown. Legacy suggested rates are
editable starting values, not advice about current statutory rates. The optional
40-character withholding tax classification also round-trips.

Workflow: save a draft, edit or soft-delete it, submit, have a tenant administrator
approve, then post. Posting revalidates the live payee, accounts, currencies,
organizations and period, and calls `JournalService::createAndPost` inside the
same transaction. Voucher/journal linkage and account balances commit together;
retries cannot duplicate posting. Posted vouchers are immutable. Employee batch
numbers have an `EPV-` prefix using the existing tenant/unit voucher sequence
(shared counter with supplier payments, so each type may have gaps).

Apply existing migrations through **019_employee_biodata.sql** (including 017
voucher posting and prerequisites). No new application migration is needed:
`employee_id`, `employee_name`, `tax_type` and line `has_imprest` already exist.
No migration or seed was applied to an application database during development.
The legacy JS only stores `hasImprest`; it does not create an imprest advance.
This implementation likewise preserves the flag without inventing an advance,
retirement, refund or separate imprest subledger ceremony. Customer receipt persistence is described below.

Verification: pure employee options/flag tests, the shared frontend/C++ voucher
math parity tests, `test/vouchers/lookups_browser_test.mjs` (real Chromium and
built Nuxt/BFF with a controlled upstream), and `test/vouchers/run_pg.sh` (real
PostgreSQL and the actual voucher/journal services with a synchronous coroutine
transport seam). Coverage includes supplier regression, employee pagination,
save/edit hydration, independent flags, no retention, withholding, FX, live payee
scope, approval, transaction rollback, posting retry and immutable posted rows.


## Customer receipt vouchers

The live receipt form follows `templates/CustomerReceiptVouchers.cshtml` and
`templates/customer-receipt-voucher.js` from commit 74e54a8. It selects a live
customer, bank/cash GL and linked bank record, entry/receipt dates, payment mode,
cheque number when needed, transaction currency/rate, and invoice/reference/
description/organization allocations. Customer choices come from the paginated,
authenticated `/api/shared/customers` BFF (`/api/v1/shared/customers` upstream),
not demo payees. Only active customers in the posting unit are offered. Catalog
failures clear choices and block saving; every upstream call carries the token.

The supplied JS explicitly builds **two journal lines**: bank/cash debit for the
sum of *all* allocations, and customer receivable credit for that same total.
This implementation preserves that mapping. All allocations must use the selected
customer's mapped receivable GL and one organizational unit (the first row's OU
and reference are used on the aggregate journal). Unlike the legacy script,
conflicting accounts or OUs are rejected rather than silently discarded. The
form defaults customer GL/currency on selection and inherits GL/OU for new rows.
The table correctly calls the receivable allocation a **Credit G/L** despite the
legacy template's misleading Debit label. Individual invoice/reference details
remain in the saved voucher; this does not implement invoice matching/settlement.

Receipts have **no tax, withholding, retention or imprest controls**. Hidden old
payment flags/taxes/retentions are cleared during receipt hydration/payload
construction, and the server rejects enabled taxes, withholding, retentions or
imprest fields. Gross equals net received. Shared fixed-point rounding is kept:
local amounts round half-up to two decimals per row, and foreign amounts convert
once to the unit base currency before rounding. Source foreign amounts and the
entered rate remain on the voucher; the journal posts in base currency at rate 1.

The same voucher API implements preview, create, read/list, optimistic-versioned
draft update/delete, submit, administrator approval and posting. Receipt numbers
use `CRV-` and the existing shared tenant/unit sequence (gaps per type are normal).
The common voucher table stores `customer_id/customer_name`, `is_payment=false`,
and the receipt date in its existing `payment_date` column, while `source_payload`
retains `receiptDate`. Existing generic `debit_account_id` line columns retain
source allocation GLs, not a claim about the posted journal side. Posting calls
`JournalService::createAndPost` transactionally: voucher linkage, posted journal,
history and GL balances commit or roll back together; retries cannot duplicate
posting and posted vouchers cannot be edited/deleted. Unit/date/period, active
payee, accounts/currencies and organization scope are revalidated on posting.
Posting period selection stays available outside the payment-only tax section.

### Customer catalog prerequisite and deployment

No customer table/API existed in this checkout, so migration
**020_customer_receipts.sql** adds the minimal tenant-owned `core_customers`
catalog and tenant-scoped voucher customer FK/live-link trigger. It uses existing
migrations through 019 and has a matching down migration. It is registered for
the existing audited tenant business-data reset. No seed/demo customer is added.
**No application database migration was applied during development.**

Create customers at **Shared config → Customers** (`/ledger/shared-config/customers`).
Customer add/edit now opens an expanded modal with the legacy contact, tax, group,
status, currency/rate and GL fields; see [customer-crud.md](customer-crud.md). Authenticated live tenant users can read the minimal catalog;
only tenant administrators can create/update/archive. Tenant/audit scope comes
from the authenticated actor, never the body. Mapping validates a live,
manual-postable, non-control base-currency GL in the chosen active unit, plus an
active transaction currency. Numbers remain reserved after archive; stale
versions fail. A live receipt prevents changes/archival that could invalidate
its customer mapping. This is a minimal receipt prerequisite, not a full sales,
credit-control or accounts-receivable/invoice management subsystem.

Verification includes real PostgreSQL migrations (020 up/down/up), customer CRUD,
minimal lookup access/admin-only writes, scoped validation and soft deletion;
receipt preview/save/edit/delete/approval/posting, all-row sums and correct bank
and receivable balance directions, rollback after journal creation, idempotent
retries, FX and incoming direction, and supplier/employee regressions. Chromium
exercises real built Nuxt/BFF with controlled upstream contracts for customer
pagination/filtering, receipt defaults/preview/save/hydration/post transport,
failure without stale/demo choices and customer catalog CRUD. PostgreSQL tests
run the actual services with a synchronous coroutine transport seam, not a fully
linked Drogon HTTP application. The new controller and both affected services
also pass native syntax checking with real Drogon/Trantor/JsonCpp headers.

The additive legacy `Customer` field extension is documented in
[`customer-schema.md`](customer-schema.md); apply migration 021 for that schema
extension. Migration 022 and the expanded customer/group modal CRUD are described
in [customer-crud.md](customer-crud.md); receipt mapping semantics remain unchanged.
