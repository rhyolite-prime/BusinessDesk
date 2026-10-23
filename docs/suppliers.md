# Supplier groups and suppliers

## Deployment

Apply migrations through **016_suppliers.sql** to the backend database/schema,
then rebuild/restart C++ and Nuxt. Apply migrations in order, using an explicit
matching `search_path` for custom schemas. The API fails closed with
`schema_not_ready` / 503 if supplier tables are missing; Nuxt names migration 016.
No runtime table creation or demo persistence is used.

```sh
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f database/migrations/016_suppliers.sql
```

The down migration drops supplier data, indexes, triggers, voucher FK and reset
registry entries. Back up first and stop application writes before downgrading.
It must run before downgrading migration 015.

The existing `gl_payment_vouchers.supplier_id` receives a composite, tenant-scoped
FK **NOT VALID**: existing legacy supplier IDs are not rewritten or removed.
New/changed references are enforced. Review unmatched legacy voucher references
before manually validating `fk_payment_voucher_supplier`. A trigger additionally
requires new/changed voucher supplier links to be live and use the supplier's
posting accounting unit. NULL supplier links remain supported.

## Frontend

Under **General Ledger → Shared config**:

- `/ledger/shared-config/supplier-groups`: search, paginate, create, view, edit and
  confirm soft deletion of groups.
- `/ledger/shared-config/suppliers`: search name/account number/email, paginate,
  view complete details, create/edit contacts, tax information, status, currency,
  credit limit and four GL defaults; confirm soft deletion.

Both use the existing `PageHeader`, `BaseButton`, `FormField`, `TextInput` and
`Pagination` design system and shared color tokens. Dialogs support focus
trapping, Escape, focus restoration, scrolling, small screens and dark mode.
Busy state prevents accidental resubmission/dismissal. Lookup choices have
server search and pagination rather than silently showing only the first page.
Errors retain form values. Failed saves do not invent successful local records.
Identity changes clear rows, forms and stale asynchronous results.

Tenant IDs use the application's existing **UUID** representation, rather than
the integer TenantId in the supplied ABP example. Tenant/actor/audit values come
only from the authenticated server context. All live tenant users can perform
CRUD, matching existing shared bank configuration; host scope is not accepted.
The backend rechecks live tenant/user status, including lockout and deletion.

## Data rules

- Group: `name` required, trimmed, maximum 200 UTF-8 bytes. Live names are
  case-insensitively unique per tenant. A group with any live suppliers cannot
  be deleted. Deleting a group never silently deletes its suppliers.
- Supplier: `accountNumber` (80 bytes), `name` (200), group, status, currency,
  all four account IDs, credit limit and `isResident` are required.
- Optional strings default to empty: email/contact email (254), phone/contact
  phone (50), address (1,000), contact person/tax office (160), TIN/VAT number
  (80). Emails are validated when supplied. Embedded NUL and unknown fields are
  rejected. Limits are deliberately checked before database insertion.
- Status IDs are `active`, `on_hold`, `inactive`; status labels are derived.
- Group must be a live record in this tenant. Currency must be active in the
  **global/shared host catalog**, not tenant-owned.
- Credit GL must be **Liability** (`standard_account_type=1`, the existing enum).
  Credit/debit/VAT/IRS accounts are required, active, live, tenant-owned and
  belong to **one active accounting unit**. All account types are allowed for
  debit/VAT/IRS. The credit choice determines the unit for the other lookups.
- Relationship names/codes (`supplierGroupName`, account names, currency
  name/code, status name) are derived by scoped joins, not writable snapshots.
  Renaming a group or account therefore does not leave stale supplier labels.
- Directory buying/selling rates were removed by migration 023; these fields are
  neither displayed nor accepted by CRUD. Currency catalog and voucher FX remain unchanged.
- `creditLimit` remains a nonnegative exact decimal string (up to 14 integer
  and 6 fractional digits), stored as `numeric(20,6)`. JSON numbers and exponent
  notation are rejected to prevent precision loss.
- `balance` is `numeric(20,6)`, **read-only**, initially zero; ordinary supplier
  edits never rewrite it. No new AP invoice/posting subsystem or editable opening
  balance is implied by this master-data CRUD feature.
- A nonzero balance **or live payment voucher** prevents deletion and changes to
  account number, currency or posting accounts. Contact/status/terms changes
  remain possible. Existing GL/currency APIs are also protected by update
  triggers against deleting/deactivating used accounts/currencies or changing
  referenced GL identity/classification. Those operations return conflict.
- Account numbers remain case-insensitively reserved per tenant after ordinary
  soft deletion, preserving accounting identity. Confirmed business-data
  initialization physically removes archived suppliers and releases the code.
- Create/update/delete persist the existing FullAudited-style timestamps and
  actor IDs. Reads return create/update audit metadata. Updates require the
  current integer `version` to reject stale edits; create starts at version 1.
- All ordinary data queries/mutations use `is_deleted=false`. The explicit
  confirmed-reset exception still includes archived business rows.

Parent relationships and actor/tenant rows are locked during writes. Unit locks
precede currency/account locks, matching ledger mutation order. Group deletion
and supplier writes serialize; a new voucher cannot race a supplier deletion.
Supplier writes run in transactions and only report success after commit
acknowledgment. SQL parameters carry every request value; dynamic table/column
fragments are internal constants, never client-provided identifiers.

## API

Backend routes use `TenantJwtAuthFilter` and the standard `BaseApiResponse`:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/shared/supplier-groups` | Paginated group list |
| POST | `/api/v1/shared/supplier-groups` | Create `{name}` |
| GET | `/api/v1/shared/supplier-groups/{id}` | Get live group |
| PUT | `/api/v1/shared/supplier-groups/{id}` | Update `{name, version}` |
| DELETE | `/api/v1/shared/supplier-groups/{id}` | Audited soft delete |
| GET | `/api/v1/shared/suppliers` | Paginated supplier list |
| POST | `/api/v1/shared/suppliers` | Create supplier |
| GET | `/api/v1/shared/suppliers/{id}` | Get complete live supplier |
| PUT | `/api/v1/shared/suppliers/{id}` | Full replacement of writable fields plus `version` |
| DELETE | `/api/v1/shared/suppliers/{id}` | Audited, guarded soft delete |
| GET | `/api/v1/shared/suppliers/options` | Paged lookup choices |

List query: `pageNo=1&pageSize=20&query=...`; page size 1–100, search up to 200
bytes, stable name/ID ordering. Result: `{data,totalCount,pageNo,pageSize,totalPages}`.
Lookups additionally accept `kind=groups|currencies|accounts|credits` and optional
`accountingUnitId`; options return `{id,label,unitId}` (unitId empty for catalogs).
No caller-supplied tenant scope is accepted in write JSON.

Example creation (substitute real tenant-owned group/accounts and a global currency):

```json
{
  "accountNumber": "SUP-0001",
  "supplierGroupId": "<group UUID>",
  "name": "Accra Supplies Ltd",
  "statusId": "active",
  "vatAccountId": "<VAT GL UUID>",
  "creditAccountId": "<AP liability GL UUID>",
  "debitAccountId": "<debit GL UUID>",
  "irsAccountId": "<IRS GL UUID>",
  "currencyId": "<global currency UUID>",
  "creditLimit": "50000.000000",
  "isResident": true,
  "email": "accounts@example.com",
  "phoneNo": "+233200000000",
  "address": "Accra",
  "contactPerson": "Ama Mensah",
  "contactPersonPhone": "",
  "contactPersonEmail": "",
  "tinNumber": "",
  "vatNumber": "",
  "taxOffice": "Accra"
}
```

Equivalent Nuxt paths omit `/v1`. Every proxy call forwards the bearer token,
requires a server-validated session, uses `Cache-Control: no-store`, rejects
cross-origin writes, does not retry mutations and sanitizes backend errors.
Statuses: 400 invalid data, 401 unauthenticated, 403 inactive/wrong-scope actor,
404 missing/deleted/foreign record, 409 duplicate/reserved identity, stale
version or protected references, 503 unavailable schema/database/failed commit.

## Reset integration

Migration 016 registers both new tables in the reviewed **Suppliers** module.
The reset engine expands groups to suppliers, and suppliers to payment vouchers
and the coupled financial transaction/balance group. **Initializing supplier
masters can therefore clear the whole tenant's financial transaction group**, not
only that supplier's payments. The administrator must review the complete
expanded preview and counts before the existing password/typed confirmation.
Other tenants, company profile, users/access, security, global currencies,
preferences and reset audit remain preserved. This is separate from ordinary
soft deletion and follows all safeguards in [Preferences](preferences.md).

## Verification

```sh
npm --prefix frontend run typecheck
npm --prefix frontend run build
SUPPLIERS_TEST_DATABASE_URL='postgresql://...' \
  SUPPLIERS_PG_DEPS='/path/to/pg-npm-install' \
  JSONCPP_SOURCE_DIR='/path/to/jsoncpp-with-dist' LIBPQ_LIB_DIR='/path/to/libpq' \
  SUPPLIERS_TEST_SANITIZERS='-fsanitize=address,undefined -fno-omit-frame-pointer' \
  bash test/suppliers/run_pg.sh
SUPPLIERS_BROWSER_DEPS='/path/to/playwright-core-and-@sparticuz/chromium' \
  node test/suppliers/http_browser_test.mjs
```

Use a disposable database: setup drops/recreates **suppliers_test**. The native
suite compiles production SupplierService with the synchronous coroutine/libpq
transport seam, real PostgreSQL, real migrations (up/down/up), exact financial
values, actual locks and commit-failure injection. It checks CRUD, foreign scope,
read-only fields, statuses, parent validity, archived visibility, balance/voucher
protection, full audit, optimistic concurrency, lookup scope and actual confirmed
reset with archived records and cross-tenant preservation. New service/controller
also pass syntax checks against real current Drogon/Trantor/JsonCpp headers;
this is not a full production backend link or deployed integration test.

The separate browser suite runs built Nuxt and real Chromium against a controlled
mock upstream, checking authentication, bearer forwarding, no-store, CSRF,
sanitized migration/error responses, actual forms/CRUD transport, stale edits,
read-only views, cancellation, references, mobile layout, pagination and lookups.
PostgreSQL behavior is covered separately, not inferred from the mock upstream.

Supplier and supplier-group deletes from the UI now send `{ version }`; supplied
versions are checked to reject stale deletion. Legacy bodyless supplier DELETE
calls remain supported. See [customer-crud.md](customer-crud.md) for the shared
directory/modal CRUD behavior and customer-group extension.

Apply `023_drop_customer_supplier_rates.sql` after 022 when upgrading. Its rollback
restores rate columns with default 1, not the dropped values; back up first.
