# Persisted local and multi-currency journals

## Deploy the database upgrade first

Apply **`database/migrations/012_journals.sql`**, not its `.down.sql`, against the
same database/schema/search path used by the backend. Apply prior feature
migrations first, including the real cost-center catalog (`007_cost_centers.sql`).
Apply **`013_accounting_period_management.sql`** as well to enable creating,
opening and closing periods in Ledger → Journal → Accounting Periods.
Apply **`014_journal_organization_units.sql`** for the consolidated journal-line
organization fields. Then rebuild/restart the backend and frontend.

```sh
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f database/migrations/012_journals.sql
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f database/migrations/013_accounting_period_management.sql
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f database/migrations/014_journal_organization_units.sql
```

The backend does not run schema DDL on startup or per request. Missing migration
readiness returns `schema_not_ready` / 503; the page identifies required migrations, including 014.
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
scope, status, names, base amounts, audit fields and deletion flags
cannot be supplied as write properties. Creation may submit the read-only
`batchNumber` preview; the server validates and resolves collisions.

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
- **Company Profile `defaultCurrencyId` is the local/base reference.** The
  profile and currency must be live, and the currency must be active. Missing,
  null or deleted configuration blocks journal entry/posting with an actionable
  message. An accounting unit's base must agree with this default: mismatches
  are rejected, never silently used to mix base balances. Reconcile existing
  accounting configuration before transacting; changing a reference does not
  revalue historical journals.
- Local (non-multi-currency) journals use only the company currency at rate
  `1.0000`. The header has no currency selector. Local mode offers only GL
  accounts configured in the company currency; each row resolves its currency
  from its selected GL. Switching multi-currency off restores the company default
  and rate 1 on every line, clearing incompatible GL selections. Foreign or
  mixed transaction currencies require multi-currency mode; GL currency matching
  and the base-currency rate-1 invariant remain enforced server-side.
- Exchange-rate fields, line previews and quote notices present **four decimal
  places**. While typing, decimal input remains editable; on blur it returns to
  four-place presentation. Existing stored rates and financial calculations keep
  their full ten-place precision: merely opening, focusing, blurring or saving an
  untouched rate never silently rounds financial data. Manually edited rates
  remain authoritative, with up to ten places accepted by the accounting API.
- GL accounts must be live, active, manual-postable, non-control and in this
  tenant/unit. Currencies must be live/active in the global catalog. Optional
  cost centers must be live and tenant-owned. Catalog names and account types
  are derived server-side, not trusted from the browser.
- Organization units use the live tenant cost-center catalog: selecting a cost
  center saves its UUID in `gl_journal_lines.organization_unit_id` and its name
  in `organization_unit_name`. Both fields are updated on edit and cleared
  together when unassigned. The name is derived server-side, never trusted
  from the client. The browser sends `organizationUnitId`; older clients may
  send `costCenterId` as a compatibility alias. Conflicting IDs are rejected.
  Responses retain `costCenterId` as an alias of `organizationUnitId` for the
  existing header/line selectors, not as a separate stored dimension.
  To preserve a line, include its read-only `id` in PUT; it must be a unique live
  line of this draft. New lines omit `id`. Omitted lines are soft-deleted.
- Migration 014 backfills **live** journal-line IDs/names from the live tenant
  catalog before dropping `gl_journal_lines.cost_center_id`. It aborts rather
  than discarding conflicting independent IDs, or an archived cost-center ID
  not already preserved in that archived line's organization field. Such legacy
  cases need operator review with backups before deployment. It does not query
  deleted catalog identities, alter posted amounts/balances or rewrite immutable
  posting snapshots. The down script recreates the compatibility column for live
  lines only; it cannot reconstruct independent historic values. Back up first.
  Other modules' cost-center columns are unchanged. In particular, balance-table
  dimensions are retained: manual journal posting maps the selected organization
  to the **existing cost-center balance key**, with the legacy organization key
  null, so new postings still accumulate against existing manual-journal balances
  instead of splitting historical balances into a new dimension.
- PUT is a full draft replacement, not a sparse patch. It requires the current
  integer `version`; update/post/delete reject stale drafts rather than
  overwriting another user's changes. Retained line IDs and creation audit
  survive edits/reordering. Soft-deleted history keeps its old position.

## Accounting periods

Manage periods at `/ledger/accounting-periods` (Ledger → Journal → Accounting
Periods). Select the accounting unit and code year, create a period **closed**,
then open it with a reason. Closing and reopening are versioned and audited;
locked periods cannot be changed here. See [Accounting period management](accounting-periods.md)
for the API, deployment and detailed lifecycle rules.

Every final-post confirmation reloads the unit's current open periods. Only
periods containing the batch date **and every transaction date** are offered;
a saved but closed/out-of-range period is never preselected. The dialog links
to period management and supports an explicit refresh. No eligible period means
confirmation is disabled. The backend repeats validation under the same unit
lock used by period closing, so a close after the dialog opens cannot be
bypassed by stale client state.

## Numbering, final posting and safeguards

New journal numbers use the tenant's live `core_system_numbers` entry with
`module_id=1` (General Ledger) and key `journal-batch-id` (case-insensitive).
Configure it in the tenant or sync the host template before creating journals.
There is no fallback to `gl_journal_batch_sequences`. Preview uses `last_no + 1`,
left-padded to `padding` digits, expanding `{NO}`, `{PREFIX}`, and `{SUFFIX}` in
`format_pattern` (including literal separators and custom token ordering).
Example: lastNo 10, padding 5, prefix JV-, suffix /26 and
`{PREFIX}{NO}{SUFFIX}` produce `JV-00011/26`. The formatted number must fit the
existing 40-byte batch-number columns. Preview does not reserve or consume it.

The form submits this read-only preview as `batchNumber` on creation. The server
validates it against the current tenant numbering pattern, locks the system
number row and journal table, and checks for prior use across that tenant's
accounting units, including archived journals. If unused, the preview is saved
unchanged; otherwise the numeric part increments until unused. The chosen number
is written to both header and lines, and `last_no` advances without moving
backwards, in the same transaction. Failure rolls everything back. Clients that
omit the preview receive a server-generated candidate. Changed formatting
requires a form reload rather than silently accepting arbitrary numbering.
Existing drafts retain their number during edits and posting. System-number
sync/reset may lower counters, but previously used journal numbers are skipped.

POST creation has no client retry idempotency key in this API; after a lost
response refresh before creating again. No new migration is required; migration
006_system_numbers.sql must already be applied along with the journal migrations.

Draft create/edit/delete do not change balances. Final posting:

1. Locks the unit and batch and checks the current draft version. Accounts,
   currencies and cost centers are locked/revalidated in stable resource order.
2. Recalculates persisted line values at the stored rates, requires positive,
   exactly equal base debit/credit totals (no rounding plug or tolerance).
3. Requires a live, open period in this unit covering **both** the batch and every
   line's transaction date. It locks the period; no automatic period creation.
   Configure periods through the Accounting Periods page.
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

### Journal header controls

The header shows a **read-only batch number**: a non-reserved server preview for
new drafts, and the actual persisted number when editing/viewing. The final
number is still allocated atomically on save; users cannot override numbering.

The header **cost-center dropdown** is a bulk/default control. Selecting a center
sets it on every current line, including in multi-currency mode. Clearing the
selection clears every line. New lines inherit this default. On reopening,
a common saved center is shown; mixed centers are shown as mixed and are not
silently rewritten until the user explicitly selects a header value.

There is **no header currency**. Each row resolves its currency from its selected
GL account; its disabled currency dropdown displays the corresponding active
Shared Config catalog entry. All pages of `/api/shared/currencies` are loaded
with authenticated requests, without demo fallback. Users cannot override a GL's
currency by editing the dropdown. Foreign GLs are available in multi-currency
mode; local mode offers only company-local GLs.

Each explicit GL selection requests the resolved currency's daily quote into the
Company Profile default currency (local-to-local is always `1.0000`). Foreign
rates are editable and a manual edit wins over in-flight lookups. Changing a GL
to a different currency clears that row's old amounts instead of reinterpreting
them as the new currency. A foreign row starts with zero local/foreign values;
local fields are read-only, and entering foreign amounts calculates their local
equivalents. A local row's foreign fields stay read-only at zero. Merely loading
an existing draft does not refresh or replace its saved rates or amounts.

New rows inherit the header cost center, not another row's foreign currency or
rate. They initially use the company-local reference until their GL is selected.
Turning multi-currency off clears incompatible foreign GL selections and amounts
and restores the company currency at `1.0000` throughout. No database migration
is needed; API payloads still contain canonical transaction amounts/rates, while
local previews and totals remain server-verifiable derived values.

### Indicative public daily exchange rates

`GET /api/ledger/journals/exchange-rate?from=USD&to=GHS` requires a validated
BusinessDesk session. `from` is the transaction currency; `to` is the accounting
unit's base currency. The server fetches latest daily quotes from the open-source
[Fawaz Ahmed Currency API](https://github.com/fawazahmed0/exchange-api), trying
`cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/{from}.json`
and its documented `latest.currency-api.pages.dev` fallback. No credentials,
accounting unit IDs or transaction data are sent to the public provider. Only
validated three-letter symbols are interpolated into fixed HTTPS hosts; redirects
are disabled and each provider attempt has a five-second timeout. Deployments
must permit outbound HTTPS to both provider hosts.

Quotes are **latest indicative daily rates**, not historical batch-date rates,
real-time dealing quotes, or an accounting policy decision. The UI shows source,
quote date and explicit conversion direction. Quotes older than seven days,
invalid/future dates, missing pairs and nonpositive/out-of-range values are
rejected. Valid suggestions are half-up rounded to the ledger's ten decimal
places and returned as decimal strings. Server caches are bounded (200 entries,
five-minute TTL), and concurrent pair requests are coalesced with a bounded
in-flight map. Base-to-base is exactly 1 and never needs an external request.

Selecting a GL resolves its currency and requests its rate. Local GLs use
`1.0000` without an external quote; foreign GLs use the daily-rate API. Manual editing cancels any pending suggestion for that line. Late responses
cannot overwrite an edited rate, newer currency selection, removed row, changed
unit or departed editor. A lookup failure leaves a visible manual-entry warning
and never inserts a fabricated rate. Users can still enter a valid rate and save;
posting always uses the stored rate, without depending on the public API.
Local-currency rates remain read-only at `1.0000`. Deploy frontend and backend
together. Existing migration 008 (Company Profiles), in addition to the journal
migration prerequisites, must be installed. No new schema migration is needed;
existing tenants must have a configured active company default before journals
can be entered or posted. Previous single-foreign-currency drafts must enable
multi-currency mode before being saved/posted; posted history is not rewritten.

### Template-guided multi-currency entry

The reference behavior is in `templates/Journal.cshtml` and
`templates/journal.js` (pulled in commit `f351288`). The Nuxt editor adapts the
multi-currency workflow, not the Razor/Bootstrap page or its placeholder actions:

- In multi-currency mode each line shows **Local debit/Local credit**, plus
  **Foreign debit/Foreign credit** on a separate responsive row. A company-local
  currency account accepts local amounts at rate `1.0000`; foreign fields are
  disabled. A foreign account accepts foreign amounts, while its local equivalents
  are read-only and recalculated from the actual stored rate. Blank/invalid rates
  leave local previews unavailable rather than assuming a rate of 1.
- The canonical API `debit`/`credit` remain transaction-currency amounts. Local
  previews are derived, never client-authoritative fields in the payload. There
  is no schema or API migration. Rates remain editable for foreign currencies,
  as previously requested, and display four places without rounding untouched
  stored precision. Shared Config choices and GL/currency validation are retained.
- Entering a positive amount clears the opposing side on that same row. This
  applies to local and foreign entry and never zeroes another manually edited row.
- A **new multi-currency draft with exactly two lines** suggests row 2's missing
  side from row 1's local balance. It converts through the company currency into
  row 2's currency/rate. It does **not** copy raw foreign numbers across different
  currencies, sum unlike currencies, or use floating-point balance tolerances.
  A missing/invalid rate pauses suggestions; a nonrepresentable six-place amount
  produces a rounding warning rather than a silently fabricated balance.
- Manually editing row 2's amount immediately stops fresh-pair suggestions for
  that row. Existing saved drafts and posted journals are never auto-rebalanced.
  Adding a third row uses the established Add line deficit suggestion instead.
- New rows inherit cost centers, not currency/rate defaults. Their currency is
  resolved by the chosen GL, which requests a fresh quote. Smooth scrolling is
  retained. Different-currency GL changes clear old amounts; users then enter
  amounts in the newly resolved currency rather than reusing unrelated numbers.
- Local totals and posting still require positive, exact base balance. Invalid
  arithmetic displays a waiting state rather than a misleading Balanced badge.

Template-specific recipient/organizational dimensions, browser-generated saved
IDs, disabled foreign-rate editing, dummy export/delete actions and two-decimal
floating-point arithmetic are intentionally not copied into the accounting API.

### Description suggestions and new-row navigation

Batch number, batch date and description occupy one desktop
row, reflowing on smaller screens. Cost center and journal mode remain below.

New draft header descriptions use keywords from the local/multi-currency mode,
batch date, selected currencies and up to two account names. Detail descriptions
use the debit/credit side, account, currency, transaction date, reference and cost
center. These are deterministic suggestions from the entered data, not invented
transaction purposes or an external AI call. UTF-8 byte limits match the API
(200 for header; 300 per detail), without splitting Unicode characters.

Suggestions follow context changes until the user types in that description;
manual text, including deliberate clearing, is never overwritten. Existing
nonempty saved descriptions are preserved. Empty descriptions on editable drafts
may receive suggestions; posted/read-only journals are not changed.

After Add line renders the new row, it scrolls smoothly into view and focuses its
GL selector without a second focus jump. Scroll margin keeps it clear of sticky
headers. Reduced-motion preferences use instant navigation. Rapid additions only
navigate to the latest row; switching units or leaving the page invalidates
pending navigation.

### Compact entry and balancing suggestions

On desktop, GL selection and the five compact transaction-date/currency/rate/
debit/credit controls share a row. Cost center, reference, cheque number and line
description appear below the amount controls; smaller screens reflow responsively. Currency
is a read-only Shared Config catalog display resolved from the GL. Every explicit
GL selection refreshes the resolved currency's quote; saved rates are untouched
on load. The foreign exchange-rate input remains editable. Fixed GL currency
rules are still enforced by the API.

**Add line** takes the current valid base-currency debit minus credit total and
fills the missing side on the new row (credit if debits lead, debit if credits
lead). Its initial suggestion uses the company-local reference at rate 1.
Selecting a different-currency GL clears this suggestion and resolves a fresh
rate, so old amounts are not silently reinterpreted as foreign currency. A balanced
journal adds zero amounts; invalid amounts/rates are not treated as zero when
calculating a suggestion. Existing lines are never rewritten by Add line.

New two-row multi-currency balancing suggestions convert through the company
local currency using BigInt arithmetic. Rounding remnants
are flagged for review rather than silently plugged. Once either amount is
manually edited, rate changes do not overwrite it. An explicit GL currency
change clears old amounts, as described above.
Suggestions capture the deficit when the row is added, not a continuously moving
auto-balancing amount while other rows are edited.

## Verification

```sh
npm --prefix frontend run typecheck
npm --prefix frontend run build
node test/ledger/journal_model_schema_test.mjs
node --experimental-strip-types test/ledger/journal_deficit_test.mjs
node --experimental-strip-types test/ledger/journal_descriptions_test.mjs
node --experimental-strip-types test/ledger/currency_rate_test.mjs
node --experimental-strip-types test/ledger/journal_rate_display_test.mjs
node --experimental-strip-types test/ledger/journal_multi_currency_test.mjs
JOURNAL_TEST_DATABASE_URL='...' JSONCPP_SOURCE_DIR='...' LIBPQ_LIB_DIR='...' \
  bash test/journals/run_pg.sh
JOURNAL_BROWSER_DEPS='path-to-playwright-core-and-@sparticuz/chromium' \
  node --experimental-strip-types test/ledger/journals_http_test.mjs
```

The PG suite requires a **disposable PostgreSQL database** and creates/drops
`journal_test`. Optional sanitizer flags:
`JOURNAL_TEST_SANITIZERS='-fsanitize=address,undefined -fno-omit-frame-pointer -g'`.
It runs production JournalService, AccountingPeriodService and period-controller code/real SQL, with a synchronous libpq/coroutine
transport seam: migrations, scoped CRUD, system-number allocation/collision handling, stale versions,
exact FX conversion, balance/history posting, rollback injection, repeated-post
protection, processed lines, approval policy enforcement and a competing NOWAIT
connection. It also checks migration 013 up/down/up, closed-first period creation,
overlap/code conflicts, date validation, opening/closing/reopening, versions,
actor/history audits, unit/tenant/deleted isolation and period commit rollback.
Browser tests cover period creation through journal posting, stale availability,
history, scope switching, proxy authentication, origin protection and sanitized
migration failures. Browser tests use built Nuxt and real Chromium with a strict mock
upstream, not a live Drogon/JWT backend. Node 22+ is required for TS imports in
that test. Platform Chromium libraries may require `LD_LIBRARY_PATH`.

The earlier JournalService/JournalController implementation was also syntax-checked
against actual Drogon 1.9.5, Trantor and JsonCpp headers. The new period service
and controller compile in the PostgreSQL transport seam; no full backend link
or live Drogon/JWT deployment is claimed.

The organization-unit update additionally passes native syntax checks for the
journal/period services, period controller and updated `GlJournalLines` model
against current Drogon, Trantor and JsonCpp headers. Current headers are needed
for the generated model's existing `utf8Length` calls (not available in 1.9.5).
Migration 014 is tested up/down/up, with live legacy backfill, conflict rollback,
archived-data protection, organization create/edit/clear/post persistence and
server-owned names. The model schema test checks positional indices after the
physical column drop. These checks do not constitute a full backend link.


### Searchable GL accounts and floating cost-center pickers

Both journal cost-center fields and the per-line GL account picker open bounded,
searchable overlay lists without adding height to the form's grid. Opening a
header cost-center list therefore does not displace the Multi-currency checkbox.
GL search matches account number/name, preserves the local-vs-multi-currency
account filter, calls the existing currency/rate selection handler and supports
arrow keys, Enter and Escape. Unavailable saved accounts remain identifiable;
posted/read-only journals cannot change them. Adding a line focuses its GL
picker. Other account/head picker consumers keep their existing layout.
