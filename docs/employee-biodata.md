# Employee biodata

## Install

After the existing migrations through 018, apply:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/019_employee_biodata.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/002_employee_biodata_demo.sql
```

Rebuild/restart the C++ API and frontend. These scripts are **not automatically
executed against your application database**. Migration 019 has a matching down
migration, which removes the employee table and its new constraints/triggers.

The separate, optional seed inserts **five synthetic employees** only for tenant
`c6988bed-87d6-4058-ab95-5a833c27d513`. That tenant must already exist, be active
and not deleted; otherwise the seed fails and rolls back. The seed does not
create tenants/users, reset passwords, enable subscriptions, or overwrite
existing employees. Reruns preserve edits and do not resurrect deleted fixture
records. Demo identifiers are `DEMO-EMP-001` through `DEMO-EMP-005`. Government,
insurance and licence IDs/medical issues are intentionally not fabricated.
Creator user is nullable for system/import seed records; API mutations always
stamp the authenticated actor.

## Schema and adaptations

`hr_employee_biodata` includes all supplied EmployeeBioData fields, plus UUID
primary key, server-derived tenant scope, full create/update/delete audit fields,
soft deletion and optimistic `version`.

- `tenant_id` and optional `user_id` are UUIDs, matching this repository, not the
  old ABP integer IDs. Linked users must be non-deleted, non-host users of the
  current tenant. The same tenant user can have only one live employee record.
- HR department/category/grade/notch/rank catalogs do not exist yet. Their names
  are editable text and reference IDs are **nullable UUID metadata**, not invented
  catalogs or fake foreign keys. The editor labels this explicitly. A future HR
  catalog migration must validate/backfill these references before adding FKs.
- `status` retains the supplied integer contract (0–32767). The original
  EmployeeStatus enum was not provided: neither the API nor UI invents meanings
  for its codes. Seed status is 0. Payee options do not assume which code is
  "active"; they return the code for the future voucher workflow to interpret.
- Date-only employee dates use PostgreSQL `date` / ISO `YYYY-MM-DD` (1900–2999).
  Birth cannot be in the future, appointment cannot precede birth, and licence
  expiry cannot precede its issue date. Optional licence dates can be null.
- Height/weight are exact decimal strings (3 fractional digits, 0–3 metres /
  0–1000 kg). Medical limit is an exact non-negative `numeric(20,6)` string, not
  JavaScript floating-point money. Leave entitlement is an integer 0–366.
- Languages/interests/health issues are JSONB string arrays, not JSON strings:
  maximum 50 items, each 1–200 characters. The form accepts one item per line.
- Provided text lengths are enforced, including 20-character identifiers and
  100-character emails. Photo stores a relative path or HTTPS URL (350 characters),
  **not an upload**. The directory never loads third-party employee images.
- Employee identifiers are case-insensitively unique within a tenant and remain
  reserved after ordinary soft deletion. Confirmed tenant initialization/reset
  can remove employee business rows through the existing reviewed registry.

New/changed voucher and imprest employee links have tenant-scoped FKs and a
live-employee check with row locking. Constraints are `NOT VALID` for existing
legacy links: historical rows are not rewritten. Existing legacy rows should
be reconciled separately before validation. A live voucher/imprest prevents
normal employee deletion or identifier change. Existing voucher posting is
unchanged; **employee payment voucher posting is not implemented by this task**.

## API and access

All C++ routes use `TenantJwtAuthFilter`, live tenant/user checks and no-store
responses. Tenant/user/audit scope never comes from JSON. Host identities are not
accepted. These shared records do not require buying a second HR subscription
when used by Ledger or Payroll; their normal workspace gates remain unchanged.

| Method | C++ route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/shared/employees` | Search/paginated minimal directory |
| GET | `/api/v1/shared/employees/{id}` | Full editable biodata and audit stamps |
| POST | `/api/v1/shared/employees` | Create |
| PUT | `/api/v1/shared/employees/{id}` | Full replacement with `version` |
| DELETE | `/api/v1/shared/employees/{id}` | Soft delete, JSON `{ "version": n }` |
| GET | `/api/v1/shared/employees/options` | Minimal payee identities for future vouchers |

List/options query: `pageNo` (1–1,000,000), `pageSize` (1–100, default 20),
`query` (max 200 characters, literal case-insensitive identifier/name/department
search). Returns `{ data, totalCount }`; directory also returns
`capabilities.canWrite` from current server authorization. Stable order is last
name, first name, UUID.

Full CRUD is restricted to **tenant administrators** or current role grants:
`employees.read` grants directory/detail, `employees.write` grants read/write,
and `employees.manage` / `*` grant both. UI hides create/edit/delete for read-only
roles; backend independently rechecks. No permission claim in a JWT is trusted.
Use the existing role-permission storage to grant those strings; this task does
not introduce a separate role management system.

Ordinary live tenant users can access **options only**, with exactly employee
UUID, identifier, name and status. No birth date, contact, tax, national ID,
medical/health, or user-link data is exposed there. Directory responses also omit
personal/medical fields; restricted detail responses contain the full record.

Create/update JSON uses camelCase (`employeeIdentifier`, `firstName`, etc.; see
`EmployeeFields.h` / frontend `fields.ts`). First/last name, identifier, birth and
appointment dates are required. Optional fields default to empty text, null UUIDs
or licence dates, empty arrays and zero numeric values. PUT is a **replacement**,
not PATCH: submit every editable field to preserve it. Unknown/server-owned fields
are rejected, including client `tenantId`, `id`, audit fields and arbitrary version
on create. PUT/DELETE require a valid current version; conflicts return 409.
Audit timestamps/actors and versions are updated atomically, and successful
mutations are reported only after commit confirmation. Other errors are 400
validation, 401 sign-in, 403 permission, 404 unavailable/cross-tenant/deleted,
503 infrastructure/configuration. Raw database errors/PII are not logged or
returned by the employee service.

Nuxt BFF mirrors these at `/api/shared/employees`, forwarding the tenant bearer
from the httpOnly session cookie on **every request**, including DELETE bodies.
Writes enforce same-origin checks; automatic retries/caching are disabled.

## Frontend

- Ledger → Shared config → **Employees**:
  `/ledger/shared-config/employees`.
- Payroll → People → **Employee Bio Data**:
  `/payroll/people/employee-bio-data` (replaces the preview for that page only).

Both use the same connected directory, search/pagination, create/view/edit form
with all fields, delete confirmation, busy/error/empty states, and design-system
controls. Private form state is cleared on close, unmount or identity change;
stale async responses cannot populate a different tenant's session. No demo
employee fallback is used by these screens.

## Verification

```sh
EMPLOYEE_TEST_DATABASE_URL='postgresql://…/disposable_test_db' \
EMPLOYEE_TEST_DEPS=/tmp/employee-tools \
JSONCPP_SOURCE_DIR=/tmp/employee-jsoncpp \
LIBPQ_LIB_DIR=/path/to/libpq \
EMPLOYEE_TEST_SANITIZERS='-fsanitize=address,undefined -fno-omit-frame-pointer -g' \
 bash test/employees/run_pg.sh
npm --prefix frontend run typecheck
npm --prefix frontend run build
EMPLOYEE_TEST_DEPS=/tmp/employee-tools node --experimental-strip-types test/employees/browser_test.mjs
```

The PostgreSQL suite uses actual migrations/SQL/transactions with the existing
synchronous Drogon transport seam; role ORM fixtures exercise the production
permission resolver. Browser tests use actual Chromium + built Nuxt/BFF with a
controlled authenticated upstream, **not a deployed C++ HTTP server**. Browser
dependencies are `playwright-core` and `@sparticuz/chromium`; PostgreSQL setup
needs `pg`. Keep test dependencies/artifacts outside Git. Tests create/drop an
`employees_test` schema: use a disposable database only.
