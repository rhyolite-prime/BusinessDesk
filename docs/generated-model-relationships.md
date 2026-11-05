# Generated voucher relationships and composite keys

## `gl_payment_vouchers` keys

The checked-in schema has **one UUID primary key**, `id` (migration 001), not a
composite primary key. It also has these composite foreign keys:

| Constraint | Local columns | Referenced columns |
| --- | --- | --- |
| `fk_payment_voucher_supplier` (016) | `(tenant_id, supplier_id)` | `core_suppliers(tenant_id, id)` |
| `fk_voucher_employee` (019) | `(tenant_id, employee_id)` | `hr_employee_biodata(tenant_id, id)` |

Those keys deliberately prevent linking a voucher to another tenant's supplier
or employee. Keep them. They are `NOT VALID` to preserve existing legacy rows;
new/changed links are still enforced. The referenced `(tenant_id,id)` pairs are
unique. `gl_imprests` has the equivalent composite employee foreign key.

After migration 017, voucher uniqueness is additionally enforced by these
**indexes**, not a composite primary key:

- `uq_payment_voucher_request(tenant_id, accounting_unit_id, idempotency_key)`
  where the idempotency key is not null.
- `uq_payment_voucher_journal(tenant_id, accounting_unit_id, journal_batch_id)`
  where the journal is not null and the voucher is not deleted.

To inspect the *actual configured database* rather than migration files:

```sql
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.gl_payment_vouchers'::regclass
ORDER BY contype, conname;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'gl_payment_vouchers';
```

Adjust `public` if the application uses a different schema.

## Why regeneration caused a compiler error

The Drogon generator version producing these models infers foreign-key helpers
per column rather than treating the tenant/related-ID pair as one relationship.
It generated both:

```cpp
CoreSuppliers getTenant(const DbClientPtr&) const;
HrEmployeeBiodata getTenant(const DbClientPtr&) const;
```

C++ cannot overload methods by return type alone. Worse, these methods queried
`core_suppliers.id` / `hr_employee_biodata.id` using the **tenant ID**; renaming
one method would fix compilation but leave the incorrect lookup intact.

The current fix removes the spurious supplier/employee `getTenant` helpers
(including the equivalent bogus imprest helper) and keeps the actual
`getSupplier` / `getEmployee` helpers. Both blocking and callback variants use:

```sql
SELECT * FROM target_table
WHERE tenant_id = $1 AND id = $2 AND is_deleted = false;
```

Bindings are the current model's tenant ID followed by its supplier/employee ID.
Missing nullable relationships report `UnexpectedRows` instead of dereferencing
a null pointer; callback variants report through the error callback and return.
The schema and all unrelated generated columns/relationships are preserved.
Current production voucher/employee services continue to use their explicit,
tenant-scoped SQL rather than these generated navigation helpers.

## Regenerating models safely

```sh
drogon_ctl create model models
python3 scripts/fix_generated_composite_relationships.py
python3 -m unittest discover -s test/models -v
```

The repair is idempotent and covers the three known voucher/imprest supplier /
employee relationships. It validates the known generated query/bind shapes and
fails before writing files if they change unexpectedly. It preserves a genuine
`Tenants getTenant(...)` if a future generator emits one. It is not a general
replacement for composite-FK support in Drogon or a repair of every historical
navigation helper in the repository. Review regeneration diffs.

`models/model.json` already has `relationships.enabled=false`. That setting
controls configured relationships; it did not prevent the automatic FK
inference responsible for this output. Do not rely on toggling it, dropping
constraints, or changing the database primary key as a workaround.

The regenerated sources also use `drogon::utils::utf8Length`; use Drogon headers
matching the generating version. Older 1.9.5 headers do not provide that utility;
that is a separate toolchain mismatch, not this overload problem.

## Tests

- `python3 -m unittest discover -s test/models -v`: simulated regeneration,
  removal of bogus helpers, preservation of real tenant helpers, binding/null
  guard checks, idempotence, unknown-output failure without partial writes,
  and schema key checks.
- Native `-fsyntax-only` compilation against matching Drogon/Trantor/JsonCpp
  headers verifies the actual generated voucher, imprest, employee and voucher
  line translation units, not replacement model classes. The unmodified pulled
  voucher header reproduces the exact duplicate-return-type error.
- `MODEL_TEST_DATABASE_URL=... MODEL_TEST_DEPS=/path/to/test-deps node
  test/models/relationship_sql_test.mjs`: executes SQL extracted from all six
  real sync/async helpers against PostgreSQL temporary tables, checking live,
  cross-tenant and soft-deleted rows. The dependencies directory needs `pg`.
  This verifies query execution/binding order, not a full Drogon HTTP runtime.

No application database migration is needed for this C++ repair.
