# Default GL Numbers

## Scope and deployment

Default GL Numbers is **per accounting unit**, as explicitly selected for this
implementation, within the authenticated tenant. It reuses the existing
`gl_default_accounts` table from migration 001 instead of creating a competing
C#-shaped table. Tenant IDs remain UUIDs, matching the repository.

Apply `database/migrations/009_default_gl_numbers.sql` after prior migrations,
then rebuild/restart the backend and frontend. This migration replaces the
unconditional `(tenant_id, accounting_unit_id)` uniqueness constraint with a live
partial unique index, allowing recreation after soft deletion without overwriting
audited history. At most one live configuration exists per tenant/unit.

It also adds UUID foreign keys for all 38 references. They are initially
`NOT VALID` to avoid rejecting deployment over existing legacy configurations;
PostgreSQL enforces new references without silently deleting or rewriting old
rows. Inspect/repair legacy references and validate constraints separately when
appropriate. The service validates **all** selected references on every create
or update, including values retained during partial updates. Thus an invalid
legacy mapping must be cleared/repaired before saving. Reading or deleting a
legacy configuration does not require its references to remain available.

The down migration restores the original unconditional unique constraint and
fails transactionally if historical/recreated rows now share a unit. Resolve
that situation explicitly before attempting rollback; the down migration does
not silently delete audit history.

## API contract

All routes use `TenantJwtAuthFilter`, existing live-user/tenant authorization,
and JWT-derived audit identity. There is no new default-GL-specific role policy.
Host authentication cannot substitute for tenant authentication. Every query
restricts tenant, accounting unit and `is_deleted=false`. All operations require
an active, nondeleted accounting unit belonging to that tenant.

| Method | Backend path | Scope and behavior |
| --- | --- | --- |
| GET | `/api/v1/ledger/default-gl-numbers` | `?accountingUnitId=UUID`, returns `{data:[],totalCount}` |
| GET | `/api/v1/ledger/default-gl-numbers/options` | Same query, returns `{account,bank,category}` option arrays |
| GET | `/api/v1/ledger/default-gl-numbers/{id}` | Same query, returns one live record |
| POST | `/api/v1/ledger/default-gl-numbers` | Body includes `accountingUnitId`, creates (201) |
| PUT | `/api/v1/ledger/default-gl-numbers/{id}` | Body includes `accountingUnitId`, merges editable fields (200) |
| DELETE | `/api/v1/ledger/default-gl-numbers/{id}` | Same query, soft-deletes and stamps audit fields (200) |

Responses use the backend `{success,result,error}` envelope. Missing/invalid UUID
scope and invalid inputs return 400; missing authentication=401; out-of-scope,
deleted or inactive unit/record=404; duplicate live configuration=409;
DB/commit failures=503. A query/body accounting-unit mismatch is rejected.
The record ID is server-generated and cannot be supplied in a write body.
Tenant, role, scope and audit properties are not accepted from clients.

Public records contain `id`, `accountingUnitId`, `vatRate` and every mapping below.
Nullable mappings mean "Not configured". Empty string/Guid.Empty UUID input
normalizes to null. GUIDs must be strings, not arbitrary JSON scalars/objects.
Omitted mappings default to null on POST and retain their saved value on PUT.
PUT cannot move an existing configuration to a different unit. An empty mapping
set is allowed for staging or VAT-only configuration.

Example:

```json
{
  "accountingUnitId": "30000000-0000-4000-8000-000000000001",
  "salesRevenueAccountId": "50000000-0000-4000-8000-000000000001",
  "vatRate": 0.15
}
```

### VAT convention

The API and existing database store a **fraction**: `0.15` means **15%**.
`vatRate` is numeric 0–1 inclusive, up to six decimal places (`numeric(9,6)`).
Numeric strings, nonfinite values, out-of-range values and extra precision are
rejected. The UI displays and edits 0–100 percent, up to four decimal places,
and converts on read/write. Omitted VAT on create defaults to 0.

### Reference mappings

Bank-account UUIDs (active, live `gl_bank_accounts` in the selected tenant/unit):

- `accountPayablesBankAccountId`, `payrollBankAccountId`, `salesBankAccountId`,
  `accountsReceivableBankAccountId`, `purchasesBankAccountId`.

`payrollBankAccountId` is canonical, matching the existing frontend and DB.
The C#-derived input spelling `payRollBankAccountId` is accepted as an exclusive
alias; supplying both spellings is rejected. Responses use the canonical name.
The existing SQL column for `accountPayablesBankAccountId` is
`accounts_payables_bank_account_id` (note the extra "s").

Category UUID: `imprestCategoryId` (live `gl_imprest_categories` in the same unit;
that table has no active flag).

Active, live `gl_accounts` UUIDs in the same tenant/unit:

- `accountsReceivableAccountId`, `accountsPayableAccountId`,
  `withholdingTaxAccountId`, `creditPurchasesAccountId`,
  `advanceFromCustomerAccountId`, `covidTaxReceivedAccountId`,
  `communicationsServiceTaxReceivedAccountId`, `inventoryAccountId`,
  `salesRevenueAccountId`, `stockPurchasesAccountId`, `currentEarningsAccountId`,
  `retainedEarningsAccountId`, `vatReceivedAccountId`, `imprestGlAccountId`,
  `pettyCashGlAccountId`, `advanceToSupplierAccountId`, `covidTaxPaidAccountId`,
  `communicationsServiceTaxPaidAccountId`, `goodsInTransitAccountId`,
  `unrealizedFxLossAccountId`, `unrealizedFxGainAccountId`,
  `realizedFxLossAccountId`, `realizedFxGainAccountId`, `vatPaidAccountId`,
  `getflReceivedAccountId`, `getflPaidAccountId`, `nhilReceivedAccountId`,
  `nhilPaidAccountId`.
- `socialSecurityEmployerPortionDefaultExpenseGl`,
  `socialSecurityEmployeePortionDefaultExpenseGl`,
  `socialSecurityEmployerPortionDefaultLiabilityGl`,
  `socialSecurityEmployeePortionDefaultLiabilityGl` map to the existing shorter
  `social_security_{employer|employee}_{expense|liability}_account_id` columns.

A bank also needs a live, active backing GL account in the same scope. Lookup
results use exactly these eligibility rules and return `{value,label}` entries.
No fake bank/category or account options are injected. GL-bank-account and
imprest-category **editors elsewhere remain separate legacy/demo features**;
creating a demo entry there does not persist a selectable reference here.

## Transactions, audit and reference safety

Create/update/delete lock the live accounting-unit row. This serializes competing
configuration writes (including recreation) and cooperates with the existing
Account Detail service's unit lock. Writes lock/check the selected live reference
rows in a deterministic order, and bank backing GL rows, before saving. UUIDs
from another tenant/unit, inactive accounts/banks and soft-deleted records are
rejected. The SQL projection is built from internal field metadata only; client
keys are not SQL identifiers. Parameters are bound, and commit is awaited before
reporting success. Unknown write properties are rejected.

Create stamps `created_by_user_id`; update stamps modification actor/time; delete
stamps both deletion and modification actor/time. Soft-deleted rows are never
read, modified or undeleted by the API. Recreation creates a new UUID. Existing
Account Detail deletion/identity-change guards already inspect all default-GL
account reference columns and ignore deleted configurations. This feature does
not add CRUD for bank accounts/categories, implement posting calculations or
retroactively change posted transactions. Other writers may subsequently change
reference availability; this change does not claim universal cross-writer
concurrency or automatically repair those configurations.

## Frontend

`/ledger/default-gl-numbers` now uses live APIs, not `useLedgerSetup` demo writes.
Select an accounting unit explicitly (shared with the existing ledger unit state),
then view/create/edit/delete its configuration. It includes grouped selectors,
percentage VAT editing, unavailable-reference labels, loading/error/retry states,
mutation disabling, cancel, deletion confirmation, and recreation. Switching units
clears old data and rejects late results. Failed loads do not enable blind writes.

Nuxt mirrors the backend under `/api/ledger/default-gl-numbers`. It forwards the
tenant bearer on **every** request, including lookup calls; browser URLs remain
relative and tokens HttpOnly/server-side. Responses are `no-store`, mutations
use existing origin checks, retries are disabled, and backend details are not
included in public error messages. Nuxt unwraps successful bodies as 200.

The obsolete default-GL seed and local mutation helpers were removed from
`setup-data.ts`. A read-only `useDefaultGlNumbers` bridge lets legacy ledger
screens read real defaults for the selected unit, without restoring demo defaults
when unavailable. Their separate transaction/demo workflows are not replaced by
this change.

## Verification

- Frontend typecheck and production build.
- Actual Drogon 1.9.5 headers: service/controller syntax compilation.
- `test/default_gl_numbers/run_pg.sh`: **122 checks**, production service SQL
  against real PostgreSQL through the synchronous coroutine/libpq transport seam.
  Applies actual migrations 001/009. Covers all 38 field mappings, VAT precision,
  reference eligibility, tenant/unit isolation, GUID normalization, payroll alias,
  audit fields, commit rollback, unit row locking, soft deletion and recreation.
  Also passed under ASan/UBSan.
- `test/ledger/default_gl_numbers_http_test.mjs`: **26 checks**, built Nuxt with
  a strict mock upstream; transport/auth/origin/error behavior and optional Chromium
  coverage of form CRUD/cancel, VAT conversion, unit switching and recreation.
- Existing ledger, user/tenant, bank, company-profile, currency, System number
  and Cost center regressions.

The service seam is not a running Drogon HTTP/JWT deployment; Nuxt/browser tests
use a mock upstream. Full deployed-stack and financial-posting verification remain
separate checks.

Use only a disposable database for the PG test: it creates/drops the
`default_gl_test` schema, including any existing contents.

```sh
DEFAULT_GL_TEST_DATABASE_URL='host=127.0.0.1 port=5432 user=test dbname=disposable' \
JSONCPP_SOURCE_DIR=/path/to/jsoncpp LIBPQ_LIB_DIR=/path/to/libpq \
bash test/default_gl_numbers/run_pg.sh
```

For sanitizers, set `DEFAULT_GL_TEST_SANITIZERS` to
`-fsanitize=address,undefined -fno-omit-frame-pointer -g`.
