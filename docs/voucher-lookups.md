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
