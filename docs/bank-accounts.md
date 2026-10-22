# Bank Accounts

## Scope and deployment

`/ledger/bank-accounts` now provides authenticated, persisted CRUD instead of local
demo data. It uses the existing `gl_bank_accounts` table and accounting-unit scope,
consistent with Default GL Numbers. Tenant IDs are UUIDs in this repository,
rather than the integer tenant property in the C# guide.

Apply `database/migrations/010_bank_accounts.sql` after prior migrations, then
rebuild/restart the backend and frontend. The migration:

- Replaces unconditional tenant/unit/account-number uniqueness with a live unique
  index on the trimmed, case-folded number. It permits reuse after soft deletion,
  without restoring an old UUID or discarding history. Resolve legacy live
  case/whitespace-equivalent duplicates explicitly before migration; a conflict
  rolls back deployment rather than silently rewriting records.
- Adds tenant-owned bank and bank/branch membership foreign keys. They are
  `NOT VALID` initially, to preserve deployment over legacy inconsistent rows
  without silently rewriting them. New rows/changed references are constrained;
  separately inspect, repair and validate legacy references as appropriate.

The down migration restores the old unique constraint and fails transactionally
if historical/recreated rows now share an exact account number. Resolve that
situation explicitly before rolling back; history is not automatically deleted.

## API

| Method | Backend | Scope / result |
| --- | --- | --- |
| GET | `/api/v1/ledger/bank-accounts` | Query `accountingUnitId`; `{data,totalCount}` |
| GET | `/api/v1/ledger/bank-accounts/options` | Same query; `{banks,branches,accounts,currencies}` |
| GET | `/api/v1/ledger/bank-accounts/{id}` | Same query; one record |
| POST | `/api/v1/ledger/bank-accounts` | Body `accountingUnitId`; creates (201) |
| PUT | `/api/v1/ledger/bank-accounts/{id}` | Body `accountingUnitId`; partial merge update (200) |
| DELETE | `/api/v1/ledger/bank-accounts/{id}` | Query `accountingUnitId`; soft delete (200) |

The active, nondeleted accounting unit must belong to the JWT tenant. Requests
cannot move records to another unit. Query/body scope mismatches are rejected.
Reads never include deleted bank accounts. Inactive (but not deleted) bank accounts
remain visible in the list; the UI supports status/search filtering. List and
lookup endpoints return all eligible records in scope, not an implicit first page.

All routes use `TenantJwtAuthFilter`, including its live user/tenant authorization,
and JWT-derived audit identity. Host cookies/JWTs are not tenant authorization.
There is no new bank-account-specific role policy. Client-supplied tenant, record
ID, roles, scope, audit and deletion properties are rejected, not trusted.

Backend responses follow `{success,result,error}`. Validation=400, missing/wrong
scope authentication=401, missing/out-of-scope/deleted/inactive unit or missing
record=404, duplicate/reference conflicts=409, DB/commit failures=503. Nuxt mirrors
these routes under `/api/ledger/bank-accounts` and unwraps successful bodies as 200.
It forwards the bearer on **every** lookup/CRUD call, keeps HttpOnly tokens
server-side, sets `Cache-Control: no-store`, checks mutation origins, disables
retries and sanitizes error messages. Browser requests use relative URLs and the
existing ledger/auth upstream configuration.

### Example create body

```json
{
  "accountingUnitId": "30000000-0000-4000-8000-000000000001",
  "bankId": "80000000-0000-4000-8000-000000000001",
  "bankBranchId": "90000000-0000-4000-8000-000000000001",
  "accountId": "50000000-0000-4000-8000-000000000001",
  "currencyId": "40000000-0000-4000-8000-000000000001",
  "accountNumber": "00123456789",
  "accountType": "Current Account",
  "dateOpened": "2024-02-29",
  "address": "Accra, Ghana",
  "location": "Accra",
  "contactPerson": "Accounts team",
  "contactNumber": "+233201234567",
  "chequeBookStart": "000100",
  "chequeBookEnd": "000200",
  "isActive": true
}
```

### Model mapping and validation

- `bankId`, `bankBranchId`, `accountId`, `currencyId`: required nonempty UUIDs.
  Guid.Empty is not a valid reference. IDs are validated/canonicalized, never used
  as SQL identifiers.
- Bank and branch must be live tenant-owned catalog entries; the branch must
  belong to the selected bank. Banks/branches have no active flag in their schema.
- Linked GL account must be live, active and in the selected tenant/unit. Currency
  must be live/active in the shared global catalog. If the GL account has an
  explicit currency, the bank account currency must match it. With no explicit
  GL currency, any active shared currency may be selected.
- `bankName` (100), `bankBranchName` (100), `accountName` (150): **read-only derived
  snapshots**, copied from verified bank/branch/GL rows on successful writes.
  They are not free-text inputs. Catalog names exceeding these model limits are
  excluded from choices and rejected on write, never silently truncated.
- `currencyName` and `currencyCode`: read-only values projected from the live global
  currency row, not separately editable copies. Deleted currency labels are not
  displayed; invalid legacy references may read as null.
- Canonical `accountNumber` maps C# `AccountNo` / SQL `account_number` (required,
  max 100); canonical `contactNumber` maps C# `ContactNo` / SQL `contact_number`
  (optional, max 20). Exclusive input aliases `accountNo` and `contactNo` are
  accepted; providing both spellings of one property is rejected. Outputs use
  canonical names. Account numbers remain strings, retaining leading zeroes.
- `accountType`: required, max 50. `address` and `location`: optional, max 150 each.
  `contactPerson`: optional, max 130. `chequeBookStart` / `chequeBookEnd`: optional,
  max 20 each; stored as strings, not numerically ordered or auto-issued cheques.
- String limits are checked in UTF-8 bytes, consistent with existing services;
  whitespace is trimmed and NULs rejected. No field is silently truncated.
- `dateOpened`: required calendar date `YYYY-MM-DD`, stored as PostgreSQL `date`,
  not an arbitrary timestamp. Invalid leap days/months/day combinations and year
  zero are rejected. Legacy null dates remain readable but need a value on update.
- `isActive`: strict boolean; defaults true on create (existing schema extension).
  Other optional strings default to empty on create. PUT preserves omitted
  properties. Supplied nulls or numeric strings for these typed fields are not
  silently coerced. Unknown keys and derived display-name overrides are rejected.

The existing DB column widths are preserved, with the model's stricter bounds
applied at the service/UI boundary. Legacy missing bank/branch IDs may remain
readable but require repair before update. Reads coalesce nullable legacy text
fields to empty strings. Changing a catalog name does not rewrite historical
bank-account snapshots until a subsequent valid account update.

## Reference safety, audit and transactions

- Writes lock the accounting-unit row, cooperating with Account Detail and Default
  GL configuration writes. Selected live bank, branch, GL and currency rows are
  locked/validated in the transaction. Bank-before-branch order cooperates with
  catalog deletion/branch writes. Unique indexes enforce live number uniqueness
  even for nonparticipating writers.
- Live Default GL bank mappings, nondeleted payment vouchers/cash receipts, and
  permanent bank-reconciliation history prevent deletion. Reconciliations have
  no `is_deleted` column; all such history is intentionally considered.
- Used accounts cannot change bank, branch, linked GL, currency, account number,
  or be deactivated. Descriptive/contact/cheque/date edits remain allowed after
  validating retained references. This does not retroactively rewrite postings.
- Bank/branch catalog deletion now rejects any live bank-account reference. A bank
  also checks accounts linked through its live branches, protecting legacy rows
  with missing bank IDs. Soft-deleted bank accounts do not block catalog deletion.
- Create stamps creation actor/time; update stamps modification actor/time. Delete
  sets `is_deleted=true`, `is_active=false`, and both deletion/modification audit
  fields. Actors come from JWT identity, never form input.
- Commit is awaited; failed commits return failure and roll back. Deleted records
  cannot be fetched, updated, deleted again or undeleted through these APIs.
  Recreating a number creates a new UUID and preserves historical rows.

The feature does not implement bank reconciliation, payment posting, bank-feed
integration, cheque issuance, uploads or automatic migration of demo records.
Other legacy financial writers must still enforce their own scope/reference
rules; this is not a claim of universal cross-writer concurrency protection.

## Frontend and Default GL integration

The existing design-system page now has an accounting-unit selector, real catalog
selectors (branch choices depend on bank), GL-currency prefill, loading/error/retry
states, status/search filters, a scrollable create/edit modal with fixed header and
actions, cancel, and deletion confirmation/error handling. Failed loads do not
become mock data. Unit switches clear old records/options and ignore late results;
controls are disabled during mutations.

The old bank-account seed and local mutation helpers were removed from
`setup-data.ts`. A read-only `useBankAccounts` bridge supplies real records to
legacy voucher/imprest screens, adapting `currencyCode` to their existing display
shape. Their separate transaction workflows are not replaced by this CRUD change.

Created active accounts appear in the existing Default GL Numbers bank selector
for the same unit; soft-deleted accounts disappear. Default GL references block
unsafe bank-account deletion/deactivation. Bank/branch catalog management is at
`/ledger/shared-config/banks`; currencies remain the shared global catalog.

## Verification

- Frontend typecheck and production build.
- C++ syntax checks against actual Drogon 1.9.5 headers, with unused-function
  warnings treated as errors (not a full Drogon application link/runtime test).
- **77 PostgreSQL checks**, including ASan/UBSan, using production Bank Account,
  Bank catalog and Default GL services through the synchronous coroutine/libpq
  transport seam. Applies actual migrations 001, 005, 009 and 010; covers CRUD,
  tenant/unit isolation, all model bounds/types, aliases, calendar dates, reference
  validation, derived names, all financial guard sources, audit, unit row locking,
  failed-commit rollback, deletion/recreation and real Default GL integration.
- **63 existing bank-catalog PostgreSQL checks** with the updated reference guard.
- **25 Bank Account HTTP/browser checks**, built Nuxt with a strict mock upstream:
  token forwarding, scope, origin/status/error handling, real-option form wiring,
  create/read/update/delete/recreation, cancel, GL-currency prefill, unit switch,
  mobile scrolling and no browser errors.
- Existing Default GL, bank directory, company profile, Cost center, System number,
  currency, ledger and hierarchy frontend/HTTP regressions.

These seams are not a running Drogon/JWT/PostgreSQL HTTP deployment; deployment,
full permission integration and cross-writer financial posting remain separate
checks. PostgreSQL tests require a **disposable database**, and create/drop the
`bank_account_test` schema including any preexisting contents:

```sh
BANK_ACCOUNT_TEST_DATABASE_URL='host=127.0.0.1 port=5432 user=test dbname=disposable' \
JSONCPP_SOURCE_DIR=/path/to/jsoncpp LIBPQ_LIB_DIR=/path/to/libpq \
bash test/bank_accounts/run_pg.sh
```

Set `BANK_ACCOUNT_TEST_SANITIZERS` to
`-fsanitize=address,undefined -fno-omit-frame-pointer -g` for sanitizer coverage.
Optional Chromium checks use the existing external `BANK_BROWSER_DEPS` setup.
