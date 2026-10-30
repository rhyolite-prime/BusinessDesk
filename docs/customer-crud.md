# Customer groups and expanded customer/supplier CRUD

## Deployment and scope

Apply **022_customer_groups.sql** after migrations 020 and 021 and their
prerequisites. It adds the UUID/tenant-owned, full-audited `core_customer_groups`
table corresponding to the supplied C# CustomerGroup model. Names are unique
case-insensitively among live groups; ordinary delete is audited soft deletion.
The existing customer group UUID column now has a tenant-scoped FK and live-group
trigger. The FK is NOT VALID only to retain already-imported legacy group UUIDs
with no master row; new/updated assignments must reference a live group in the
same tenant. No groups are fabricated or auto-seeded. Reassign/clear unmatched
legacy group IDs before saving such a customer. The down migration removes the
master table and FK/trigger, not the customer metadata columns from 021.

The group table is registered with the existing confirmed tenant reset, whose
FK dependency graph includes customer rows and their vouchers. Existing generated
`CoreCustomers` files from the pulled commit are preserved; these services use SQL
projections, and no hand-generated relationship helpers were added. No migration
or seed has been applied to an application database during development.

## User interface

Shared config has **Customer groups**, **Customers**, **Supplier groups**, and
**Suppliers** directories. Add/view/edit open the same accessible app modal used
by the supplier UI: focus trapping, Escape/overlay close when idle, focus restore,
mobile bounds, and disabled controls while saving. Delete has its own confirmation
modal. Both directories support server search and pagination and clear state on
identity changes. Customer editing fetches full details, not a stale list snapshot.

Customer fields: account number/name, optional live customer group, status
text and optional legacy status UUID, explicit active flag, all contact/address/
TIN/VAT fields, currency, and exact-string credit limit,
receivable GL and optional separate credit/VAT/IRS GLs. Select receivable GL first
to establish the active accounting unit; changing unit clears optional GLs.
Receivable GL must be manual-postable, non-control and base-currency. Optional GLs
must be live and in that unit. Status UUID remains metadata because no status
master was supplied; it does not derive receipt eligibility (`isActive`).

Suppliers retain all database-backed contact/tax/residency/group/status/currency/
credit-limit and posting-default fields. Supplier credit GL is an AP liability
and sets the posting unit; other GLs must use that unit. Supplier status is the
existing `active/on_hold/inactive` code exposed as `statusId`, **not** a new UUID.
Customer credit GL is independent of the receivable GL used by receipt vouchers.

Balance is read-only in both forms and rejected in mutation bodies. Identity,
tenant/audit ownership, relationship names, currency names/codes and customer
snapshot labels are server-owned. Customer snapshots refresh from validated live
references on save. Exact decimals never pass through JavaScript Number in input
or payload. Credit limit is nonnegative (up to 6 fractional digits); malformed email, UUID, oversized text,
exponents, numeric JSON money and extra properties are rejected. Customer optional
UUIDs normalize empty strings to null. Omitted legacy fields on customer updates
are retained, avoiding erasure by older minimal-catalog clients.

## Endpoints

All routes below are tenant-JWT-authenticated. Nuxt exposes corresponding
same-origin `/api/shared/...` routes and forwards the session bearer token, with
no-store responses and origin checks on mutations. No browser code calls a
sandbox localhost backend.

| Backend path | Methods |
| --- | --- |
| `/api/v1/shared/customer-groups` | GET paginated/search list, POST create |
| `/api/v1/shared/customer-groups/{id}` | GET detail, PUT update, DELETE soft delete |
| `/api/v1/shared/customers` | GET paginated/search list, POST create |
| `/api/v1/shared/customers/{id}` | GET full detail, PUT update, DELETE soft delete |
| `/api/v1/shared/customers/options` | GET paginated/search groups, currencies, receivables or accounts |
| `/api/v1/shared/supplier-groups` and `/{id}` | Existing list/create and detail/update/delete |
| `/api/v1/shared/suppliers` and `/{id}` | Existing full list/create and detail/update/delete |
| `/api/v1/shared/suppliers/options` | Existing paginated/search group, currency and GL choices |

Lists accept `pageNo`, `pageSize` (max 100), `query`; options additionally accept
`kind` and optional `accountingUnitId`. Response: `{ data, totalCount, totalPages }`.
Customer create accepts writable `blankCustomer` fields; group create `{ name }`.
PUT includes current `version`. Customer/group DELETE requires `{ version }`.
Supplier/group DELETE now also checks a supplied version, and UI deletes always
send it; legacy supplier callers with no body remain supported. Names, scopes,
UUIDs, money, balances and audit fields must not be copied wholesale from GET
responses into write bodies; the forms build a writable-field-only payload.

A live tenant user can read customer/catalog choices. Customer/group writes
remain tenant-administrator-only, preserving the earlier customer policy.
Supplier access retains its existing live-tenant-user policy. Tenant identity and
actor auditing are derived from the token, never submitted by the client.

Updates/deletes use row locking and versions. Linked customer financial mappings,
account number, unit/currency, active state, or deletion are blocked by live
receipts or nonzero balances; contact/descriptive fields can still be corrected.
Supplier financial mapping/deletion protection for balances/live payment vouchers
is retained. Referenced customer/supplier groups cannot be deleted. Archived rows
are excluded from ordinary reads and lookups; customer numbers stay reserved.
All writes commit transactionally, report commit failure and roll back partial
writes. Errors are bounded application errors, not raw database messages.

## Verification

- `test/customers/rates_schema_pg_test.mjs`: populated-row rate removal,
  preservation of all other directory fields and currency records, rollback
  defaults, and safe reapplication (also runs the historical 021 schema suite).
- Real PostgreSQL: 022/023 up/down/up; expanded customer fields, group CRUD, snapshots,
  scopes, exact decimals, readonly/audit rejection, stale versions, linked-row
  protection, failed commits, soft deletion, lookup search and reset dependency.
- Existing supplier native PostgreSQL suite extended with all contact/tax fields
  and stale versioned deletes; existing financial/tenant/reset tests retained.
- `test/customers/http_browser_test.mjs`: built Nuxt/BFF and real Chromium with a
  controlled authenticated upstream; full modal CRUD, readonly/view mode,
  search/pagination/lookup paging, mobile viewport, stale updates/deletes and errors.
- Supplier browser and voucher browser suites retained. Native service suites run
  actual SQL/domain services with a synchronous coroutine transport seam; they are
  not a fully linked Drogon HTTP application. Affected controllers/services also
  pass syntax checks with real Drogon/Trantor/JsonCpp headers.

## Directory rate removal (migration 023)

Apply `023_drop_customer_supplier_rates.sql` after 022 before deploying the updated
application. It drops `buying_rate` and `selling_rate` from both `core_customers`
and `core_suppliers`; forms and CRUD payloads no longer include these fields.
Requests attempting to write them are rejected as unknown fields. Credit limits,
customer/supplier currency selection, the shared currency-rate catalog and voucher
exchange rates are unchanged. This is destructive: back up any old directory rate
values first. The down migration restores columns with defaults of 1, not their
previous values. Generated ORM snapshots are preserved (the running directory and
voucher services use SQL, not these snapshots); regenerate them with the project's
Drogon generator against the migrated database before introducing ORM callers.

## GL posting-default dropdowns

Every customer and supplier posting-default field uses the general `accounts`
lookup, whose records come from `gl_accounts` (account ID, accounting unit,
account number and account name), not groups, headers or sample defaults. The
primary receivable/credit dropdown no longer uses a category-filtered lookup.
Only live, active accounts in the current tenant and active units are listed.
The primary selection determines the unit for the other fields; changing that
unit clears dependent defaults. Existing save-time receipt eligibility, supplier
AP-liability and same-unit validations are retained.
