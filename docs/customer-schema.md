# Legacy Customer schema extension

Apply `021_customer_legacy_fields.sql` after 020 and its prerequisites. It is
additive: existing customer UUIDs, tenant/accounting-unit scope, receivable GL
mapping, currency, activity, version and full auditing columns are preserved.
No application database migration or seed is applied automatically.

The legacy C# properties map to snake_case PostgreSQL columns:

| Properties | Columns / types |
| --- | --- |
| AccountNumber, Name | Existing `account_number varchar(80)`, `name varchar(200)` |
| CustomerGroupId, CustomerGroupName | `customer_group_id uuid` (nullable), `customer_group_name varchar(200)` |
| Status, StatusId | `status varchar(80)`, `status_id uuid` (nullable) |
| Balance | `balance numeric(20,6)`; signed to allow customer credit balances |
| VatNumber, TinNumber | `vat_number varchar(80)`, `tin_number varchar(80)` |
| VatAccountId, CreditAccountId, IrsAccountId | Nullable UUIDs: `vat_account_id`, `credit_account_id`, `irs_account_id`; tenant-scoped FKs to `gl_accounts` |
| VatAccountName, CreditAccountName, IrsAccountName | Matching `*_account_name varchar(200)` snapshot columns |
| Email, PhoneNo, Address | `email varchar(254)`, `phone_no varchar(50)`, `address varchar(1000)` |
| CurrencyId, CurrencyName, CurrencyCode | Existing `currency_id` FK; new `currency_name varchar(200)`, `currency_code varchar(3)` snapshots |
| BuyingRate, SellingRate | Added by 021; removed from both customer and supplier tables by migration 023 |
| CreditLimit | `credit_limit numeric(20,6)`; nonnegative, default 0 |
| ContactPerson, ContactPersonPhone, ContactPersonEmail | `contact_person varchar(160)`, `contact_person_phone varchar(50)`, `contact_person_email varchar(254)` |
| TenantId | Existing `tenant_id uuid`, **not** the old ABP integer tenant key |
| FullAuditedEntity properties | Existing `id`, creation/modification/deletion timestamps and user UUIDs, and `is_deleted` |

New strings default to empty, money defaults to zero, optional UUIDs default to
NULL; existing customers remain usable without fabricated legacy data. Currency
snapshot names/codes are backfilled for live customers from live currencies.
Snapshots do not auto-update on catalog renames. Group/status indexes support
future tenant-scoped live-record filtering. Migration 021 originally left
group/status UUIDs without master foreign keys.
Migration 022 now supplies live tenant-scoped customer groups and the customer
group FK; status UUIDs still have no master definition or inferred enum meaning.
`status` does not implicitly change
`is_active`, which remains the receipt eligibility flag.

`credit_account_id` is a separate legacy field, not an automatic alias for
`receivable_account_id`. No existing receipt mapping is changed or inferred.
Likewise `balance` is stored metadata, not a newly implemented AR subledger;
receipt posting continues to update GL balances through the existing journal
ceremony. Client writes to tenant/audit/balance metadata have **not** been added.
The subsequent customer/group CRUD implementation now exposes writable legacy
fields through the API and a modal form; see [customer-crud.md](customer-crud.md).
The receipt lookup remains compatible with its minimal projection requirements.
Generated ORM models were not
regenerated or hand-edited; the customer service currently uses SQL projections.

The down migration is destructive **for the added fields only**: it discards
legacy metadata while retaining pre-021 customer columns and receipt links.
Back up populated legacy fields before rolling back.

## Verification (disposable database only)

`test/customers/schema_pg_test.mjs` rebuilds the existing `suppliers_test` fixture
schema, inserts an existing customer before 021, tests migration/backfill and all
legacy-field round trips, exact decimals, signed balances, tenant GL constraints,
limits and rollback/reapply. It must not target an application database:

```sh
SUPPLIERS_TEST_DATABASE_URL=postgres://.../disposable_test_db \
SUPPLIERS_PG_DEPS=/path/to/node-project-with-pg \
node test/customers/schema_pg_test.mjs
```

The existing voucher PostgreSQL test setup also applies 021, so customer CRUD and
supplier/employee/customer voucher regression tests run with the extended schema.
