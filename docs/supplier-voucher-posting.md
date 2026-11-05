# Supplier-payment voucher calculations and posting

## Database and API
Apply `017_supplier_voucher_posting.sql` after migrations 001–016 and their prerequisites. It adds versioned, authoritative source/calculation/journal snapshots to the existing voucher tables, line soft-deletion audit fields, request-key uniqueness, a one-voucher/one-journal index and a tenant-reset-registered voucher sequence. Existing legacy vouchers are retained unchanged; records without the new source snapshot are deliberately not editable/postable through this API. Import/reconcile them separately, rather than manufacturing missing tax configuration.

Authenticated tenant routes under `/api/v1/ledger/vouchers`:
- `GET /`: supplier-payment register (`search`, `status`, `type`). `GET /{id}`: detail.
- `POST /`: create draft; `PUT /{id}`: replace a draft with its current `version`.
- `POST /preview`: authoritative calculation and proposed journal, without saving.
- `POST /{id}/submit`, `/approve`, `/post`: body `{ "version": 1 }`.
- `DELETE /{id}?version=1`: soft-delete a draft and its live allocations/retentions.

Create/preview use the entry form payload plus `accountingUnitId`, `periodId`, a UUID `requestId`, and `taxes`. Requests use the existing `BaseApiResponse` envelope; Nuxt unwraps `result`, forwards the session bearer token, rejects cross-origin writes and never substitutes demo records or success responses. Employee-payment/customer-receipt persistence is not implemented by this supplier service; those forms explicitly cannot save.

Every `taxes` key (`nhil`, `getfund`, `vat`, `cst`, `covid`, `incomeWithholding`, `vatWithholding`) contains `{ "enabled": false, "rate": "0" }`. The two withholding objects additionally contain `accountId` (UUID when enabled; otherwise nullable). Rates are decimal strings representing percentages, not fractions; enabled rates must be >0 and ≤100. CST and COVID cannot both be enabled. Defaults are deliberately disabled/zero: legacy historical rates are not assertions of current tax law.

A create retry must reuse its request ID and exact normalized input. Reusing that ID with a different actor or payload conflicts. After an ambiguous save, retry unchanged or reload/reconcile the register before starting another payment. Updates/transitions use optimistic versions. Retrying an already posted voucher returns its existing posted result even with the original pre-post version; it does not post again.

## Confirmed calculation policy
- Convert source foreign row amounts to unit base currency using the supplied positive 10-decimal rate, rounding the conversion to 6 decimals as the journal engine does. Then round each gross row half-up to 2 decimals. Base-currency input uses rate one.
- Only allocations marked `isWithhold` participate in inclusive tax extraction or statutory withholding. An unmarked row remains an ordinary gross payment.
- For a marked row, exact extracted base is `gross / (1 + sum(enabled VAT/NHIL/GETFund/CST-or-COVID percentages)/100)`.
- Each enabled levy/VAT component and each income/VAT withholding is calculated on that exact extracted base and rounded half-up to 2 decimals **per row**, before summation. The displayed base is also rounded per row. There is no cascading/compounding of levies. The rounded components may not add back to gross by a cent; no artificial tax debit is created to hide this rounding.
- Inclusive VAT/levies are informational components of the gross allocation debit, matching the legacy voucher journal convention. Only statutory withholding and retentions reduce the bank payment and generate additional credits.
- Percentage retentions use the **whole voucher gross**, including unmarked rows, matching the legacy percentage-retention basis. Fixed retentions are base-currency amounts. Each retention rounds once to 2 decimals; `true` means percentage (correcting the legacy inverted handler).
- Net bank credit = gross − income withholding − VAT withholding − all retentions. Deductions cannot exceed gross; zero-value calculated retentions/allocations are rejected. A zero net payment is allowed when deductions equal gross; no zero-sided journal line is emitted.
- Decimal-string storage remains 6 decimals, using checked fixed-point integer calculations in C++ and BigInt in the browser, never binary floating-point arithmetic for financial values.

## Journal contract and transaction
`proposedJournal` is the original manual-journal input shape:
```
{ accountingUnitId, batchDate, description, periodId, isMultiCurrency, lines: [
  { accountId, currencyId, organizationUnitId, exchangeRate, debit, credit,
    description, referenceNumber, chequeNumber, transactionDate }
] }
```

The source voucher preserves foreign currency, rate and foreign amounts. Proposed journal amounts are already converted to **base currency**, so journal lines use the base currency and rate one; this prevents the legacy double-FX-conversion error. Select active, manual-postable, non-control, **base-currency GLs**. Foreign-denominated bank/GL posting is not supported by this supplier-voucher path; it must not silently mix base amounts with a foreign journal currency. Source foreign invoices can be paid through base-currency GLs. Allocation debits retain their own organizations; bank/statutory/retention credits use the first allocation's organization, explicitly shown in the form.

Workflow: Draft → Pending approval → Approved → Posted. A live tenant administrator approves. Posting rechecks live tenant/user, supplier, unit, linked bank, currencies, GLs, organizations and period. The existing journal engine additionally checks the company default/unit base-currency agreement, real line dates, exact balance, open period, and journal approval policies. Voucher approval does **not** bypass an active journal approval policy: those policies still block direct posting, as they do for manual journals.

One transaction locks the accounting unit and voucher, recomputes the authoritative proposal, creates a manual journal and calls the same journal posting implementation used by `JournalService::execute`. That implementation posts lines, upserts the existing organization/cost-center balance dimensions, writes journal history and posting audits. Only then is the voucher marked posted and linked to its journal. Any validation, policy, database or commit failure rolls back the journal, sequence allocation, balances, history and voucher mutation together. Source voucher records are immutable after posting. This updates GL balances; it does not invent a separate supplier-subledger balance rule.

The downgrade keeps line audit/deletion fields (to avoid resurrecting archived allocations) and restores ordinary nullable request-key uniqueness, not the legacy one-NULL-key-per-unit defect. Reapplying the upgrade tolerates those retained audit columns. Downgrading removes source/calculation snapshots: back up and reconcile posted vouchers before downgrading a populated installation.

## Verification
- `test/vouchers/run_pg.sh`: real disposable PostgreSQL migrations/down/up and native service/transaction tests; accepts `VOUCHER_TEST_SANITIZERS='-fsanitize=address,undefined -fno-omit-frame-pointer'`. Uses a synchronous Drogon coroutine transport seam, not a deployed HTTP backend. Requires a UTF-8 PostgreSQL database, `SUPPLIERS_TEST_DATABASE_URL`, `JSONCPP_SOURCE_DIR`, `LIBPQ_LIB_DIR`, and npm `pg` in `SUPPLIERS_PG_DEPS`.
- Compile `test/vouchers/math_driver.cc` with JsonCpp; run `VOUCHER_MATH_DRIVER=/path/to/driver node --experimental-strip-types test/vouchers/math_test.mjs`: known results plus generated exact C++/TypeScript parity vectors (including cent ties, FX, mixed flagged rows, CST/COVID, limits and invalid inputs).
- Build Nuxt, then `LD_LIBRARY_PATH=/path/to/browser/libs node --experimental-strip-types test/vouchers/lookups_browser_test.mjs`: real browser/Nuxt with a controlled authenticated upstream, checking lookups, taxes, withholding credits, period selection, live saves, post response unwrapping and cross-origin rejection. Not a deployed C++ HTTP end-to-end claim.
