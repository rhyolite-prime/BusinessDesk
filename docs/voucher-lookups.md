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
retirement, refund or separate imprest subledger ceremony. Customer-receipt
persistence remains unsupported.

Verification: pure employee options/flag tests, the shared frontend/C++ voucher
math parity tests, `test/vouchers/lookups_browser_test.mjs` (real Chromium and
built Nuxt/BFF with a controlled upstream), and `test/vouchers/run_pg.sh` (real
PostgreSQL and the actual voucher/journal services with a synchronous coroutine
transport seam). Coverage includes supplier regression, employee pagination,
save/edit hydration, independent flags, no retention, withholding, FX, live payee
scope, approval, transaction rollback, posting retry and immutable posted rows.
