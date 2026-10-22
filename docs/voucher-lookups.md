# Voucher entry: live lookup wiring

`/ledger/vouchers/new/supplier-payment` now reads tenant-authenticated APIs rather
than the former supplier, bank, currency, organization and account fixtures.
No migration is needed beyond existing migrations through 016.

- Accounting unit: active `/api/ledger/accounting-units` records; unit base currency
  is authoritative for conversion and all local-currency labels (not fixed GHS).
- Supplier: live `/api/shared/suppliers`, traversing pagination, excluding inactive
  suppliers and restricting choices to their posting unit. Selecting a supplier
  defaults the empty debit allocation to its configured AP liability GL and uses
  its catalog currency. Existing entered allocations are not overwritten.
- Bank/cash GL, debit GL and retention GL: active chart-of-account details from
  `/api/ledger/accounts?accountingUnitId=...`, traversing pagination. Bank GL IDs
  are real chart account IDs, never bank-directory IDs or demo IDs. For the existing
  voucher-save contract, the selected GL must have a real active Bank Account
  configuration; its bank record ID/name are resolved from the bank-account API.
  Missing configuration is an explicit validation error, not a fabricated ID.
- Currency: active global catalog `/api/shared/currencies`, with paging.
- Organizational unit: tenant cost centers from `/api/shared/cost-centers`, with
  hierarchy paths and no default demo organization. Empty selection is allowed.

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

Description suggestions include workflow, payee, payment mode/date, transaction
currency/amount and unique invoice/reference keywords, capped at 300 characters.
Automatic suggestions update while untouched. A manual description is preserved;
**Use suggested description** explicitly replaces it. Existing draft descriptions
are not automatically rewritten.

This change wires entry lookups and rate suggestions into the **existing voucher
save/edit transport**; it does not implement a new C++ voucher posting/approval
service. Employee/customer payee catalogs and legacy demo voucher normalization
are outside this supplier-lookup task. Production voucher persistence must be
provided by the configured voucher API; configuring these lookups does not imply
that the existing save/approve/post endpoints have been deployed.

Verification:

```sh
npm --prefix frontend run typecheck
npm --prefix frontend run build
node --experimental-strip-types test/vouchers/description_test.mjs
VOUCHER_BROWSER_DEPS=/path/to/playwright-core-and-@sparticuz/chromium \
  node test/vouchers/lookups_browser_test.mjs
```

Browser tests use built Nuxt, real Chromium and controlled upstream fixtures;
foreign quote responses are intercepted to avoid live-provider/network dependency.
They verify authenticated base-rate routing, bearer forwarding, paged suppliers,
unit/currency scope, chart details, defaults, descriptions, manual overrides,
quote failure and no fabricated fallback. They do not claim a live C++ voucher
posting integration.

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
Fields: customer number, name, posting unit, receivable G/L, transaction currency,
and active flag. Authenticated live tenant users can read the minimal catalog;
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
extension. It does not change the minimal receipt lookup or customer form.
