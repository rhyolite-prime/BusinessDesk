# Supplier-payment voucher calculations and posting

## Saving and voucher preview

The draft action offers **Save** and **Save and Preview** for each voucher type. Save returns to the register filtered to that voucher type. Save and Preview first saves the draft, then opens a report viewer using the returned, authoritative calculation snapshot; closing it returns to the appropriate register tab. PDF, Word, Excel and printing use the same saved voucher data, including all allocation rows and tax/retention totals. The company header is loaded separately; an unavailable company profile does not cancel a successful save. The report is a draft preview, not a posting or approval.

## Database and API
Apply `017_supplier_voucher_posting.sql` after migrations 001–016 and their prerequisites. It adds versioned, authoritative source/calculation/journal snapshots to the existing voucher tables, line soft-deletion audit fields, request-key uniqueness, a one-voucher/one-journal index and a tenant-reset-registered voucher sequence. Existing legacy vouchers are retained unchanged; records without the new source snapshot are deliberately not editable/postable through this API. Import/reconcile them separately, rather than manufacturing missing tax configuration.

Authenticated tenant routes under `/api/v1/ledger/vouchers`:
- `GET /`: supplier-payment register (`search`, `status`, `type`). `GET /{id}`: detail.
- `POST /`: create draft; `PUT /{id}`: replace a draft with its current `version`.
- `POST /preview`: authoritative calculation and proposed journal, without saving.
- `POST /{id}/submit`, `/approve`, `/post`: body `{ "version": 1 }`.
- `DELETE /{id}?version=1`: soft-delete a draft and its live allocations/retentions.

Create/preview use the entry form payload plus `accountingUnitId`, `periodId`, a UUID `requestId`, and `taxes`. Requests use the existing `BaseApiResponse` envelope; Nuxt unwraps `result`, forwards the session bearer token, rejects cross-origin writes and never substitutes demo records or success responses. The same voucher service supports employee-payment and customer-receipt drafts with their respective validation rules.

Every `taxes` key (`nhil`, `getfund`, `vat`, `cst`, `covid`, `incomeWithholding`, `vatWithholding`) defaults to `"enabled": false`, with `"rate": "5"` for `incomeWithholding`, `"rate": "7"` for `vatWithholding`, and `"rate": "0"` for the remaining levies/VAT. The two withholding objects additionally contain `accountId` (UUID when enabled; otherwise nullable). Rates are decimal strings representing percentages, not fractions; enabled rates must be >0 and ≤100. CST and COVID cannot both be enabled.

In the supplier-payment form, explicitly checking a row’s Withhold box enables NHIL 2.5%, GETFund 2.5%, VAT 15%, income withholding 5%, and VAT withholding 7%. Existing nonzero and manually edited rates remain editable and are preserved while at least one row remains checked. Unchecking a row excludes it from the tax calculation; unchecking the last withheld row disables all tax options and sets every rate to zero, including CST and COVID. Retentions and selected credit accounts are not cleared. Unchecking an individual supplier tax also clears its rate, including the component switched off by CST/COVID mutual exclusion. Re-enabling a component may require entering its rate again. Loading a draft does not trigger these defaults. Verify rates and withholding accounts for the transaction. This is form behavior only, not a change to API defaults or employee/receipt forms. The tax preview updates as foreign amounts or exchange rates change and may exclude blank rows (marked as partial); it ignores retentions. Save validation and the proposed journal still require the complete voucher.

A create retry must reuse its request ID and exact normalized input. Reusing that ID with a different actor or payload conflicts. After an ambiguous save, retry unchanged or reload/reconcile the register before starting another payment. Updates/transitions use optimistic versions. Retrying an already posted voucher returns its existing posted result even with the original pre-post version; it does not post again.

## Confirmed calculation policy
- Convert source foreign row amounts to unit base currency using the supplied positive 10-decimal rate, rounding the conversion to 6 decimals as the journal engine does. Then round each gross row half-up to 2 decimals. Base-currency input uses rate one.
- Only allocations marked `isWithhold` participate in inclusive tax extraction or statutory withholding. An unmarked row remains an ordinary gross payment.
- For a marked row, exact extracted base is `gross / (1 + sum(enabled VAT/NHIL/GETFund/CST-or-COVID percentages)/100)`.
- Each enabled levy/VAT component and each income/VAT withholding is calculated on that exact extracted base and rounded half-up to 2 decimals **per row**, before summation. The displayed base is also rounded per row. There is no cascading/compounding of levies. The rounded components may not add back to gross by a cent; no artificial tax debit is created to hide this rounding.
- Inclusive VAT/levies are informational components of the gross allocation debit, matching the legacy voucher journal convention. Only statutory withholding and retentions reduce the bank payment and generate additional credits.
- Percentage retentions use the **voucher net before retentions**: gross across all rows, including unmarked rows, minus income and VAT withholding. Inclusive VAT/levies are already part of gross and are not separately subtracted. Multiple percentage retentions use the same non-compounding basis; fixed retentions remain base-currency amounts. Each retention rounds once to 2 decimals; `true` means percentage.
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

Previously saved vouchers retain their stored calculation snapshots. Drafts created under the old gross-based retention policy must be opened and updated before submission; affected pending or approved vouchers must be recreated and approved again. Submission, approval and posting reject a calculation that no longer matches its snapshot rather than silently posting a different amount. Already posted vouchers remain unchanged.

Workflow: Draft → Pending approval → Approved → Posted. A live tenant administrator approves. Posting rechecks live tenant/user, supplier, unit, linked bank, currencies, GLs, organizations and period. The existing journal engine additionally checks the company default/unit base-currency agreement, real line dates, exact balance, open period, and journal approval policies. Voucher approval does **not** bypass an active journal approval policy: those policies still block direct posting, as they do for manual journals.

One transaction locks the accounting unit and voucher, recomputes the authoritative proposal, creates a manual journal and calls the same journal posting implementation used by `JournalService::execute`. That implementation posts lines, upserts the existing organization/cost-center balance dimensions, writes journal history and posting audits. Only then is the voucher marked posted and linked to its journal. Any validation, policy, database or commit failure rolls back the journal, sequence allocation, balances, history and voucher mutation together. Source voucher records are immutable after posting. This updates GL balances; it does not invent a separate supplier-subledger balance rule.

The downgrade keeps line audit/deletion fields (to avoid resurrecting archived allocations) and restores ordinary nullable request-key uniqueness, not the legacy one-NULL-key-per-unit defect. Reapplying the upgrade tolerates those retained audit columns. Downgrading removes source/calculation snapshots: back up and reconcile posted vouchers before downgrading a populated installation.

## Verification
- `test/vouchers/run_pg.sh`: real disposable PostgreSQL migrations/down/up and native service/transaction tests; accepts `VOUCHER_TEST_SANITIZERS='-fsanitize=address,undefined -fno-omit-frame-pointer'`. Uses a synchronous Drogon coroutine transport seam, not a deployed HTTP backend. Requires a UTF-8 PostgreSQL database, `SUPPLIERS_TEST_DATABASE_URL`, `JSONCPP_SOURCE_DIR`, `LIBPQ_LIB_DIR`, and npm `pg` in `SUPPLIERS_PG_DEPS`.
- Compile `test/vouchers/math_driver.cc` with JsonCpp; run `VOUCHER_MATH_DRIVER=/path/to/driver node --experimental-strip-types test/vouchers/math_test.mjs`: known results plus generated exact C++/TypeScript parity vectors (including cent ties, FX, mixed flagged rows, CST/COVID, limits and invalid inputs).
- Build Nuxt, then `LD_LIBRARY_PATH=/path/to/browser/libs node --experimental-strip-types test/vouchers/lookups_browser_test.mjs`: real browser/Nuxt with a controlled authenticated upstream, checking lookups, taxes, withholding credits, period selection, live saves, post response unwrapping and cross-origin rejection. Not a deployed C++ HTTP end-to-end claim.
