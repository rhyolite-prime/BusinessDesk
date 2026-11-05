# Budget CRUD

## Deployment and scope

The `/ledger/budgets` page uses persisted `gl_budgets` and `gl_budget_details`,
not local/demo state. Apply **`database/migrations/011_budgets.sql` after the prior
migrations**, including `007_cost_centers.sql`, then rebuild/restart both apps.
Use the existing ledger/auth upstream configuration; browser calls are relative.

Migration 011 adds soft-delete/modification/deletion audit columns to monthly
details, a live period unique index, a live header unique index and a tenant-scoped
cost-center foreign key. The header key is account + organizational unit + cost
center + exact begin/end dates within the tenant/accounting unit. Null dimensions
compare equal. Legacy live duplicates fail migration transactionally: resolve
explicitly; no history is silently deleted or merged. Overlapping, nonidentical
ranges remain allowed; prior-year source selection rejects ambiguity.

The cost-center FK is `NOT VALID` for legacy compatibility; it enforces new/changed
references. Inspect/repair legacy references and validate separately. The down
migration fails safely if deleted/recreated historical detail periods violate the
old unconditional uniqueness; it never discards history to force rollback.

## Troubleshooting: `column d.is_deleted does not exist`

This is a database/code version mismatch, not a Nuxt URL or token problem.
Migration 001 creates details without soft-delete/audit fields; migration 011
adds those fields **and** the indexes needed for Budget writes. The backend does
not automatically apply SQL migrations when it starts. Pulling code, rebuilding
or refreshing the page does not upgrade the database.

Using a migration-capable database role, apply the complete migration against the
**same database and schema/search path as the running backend**. For example,
with your database connection configured locally (do not commit credentials):

```sh
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -f database/migrations/011_budgets.sql
```

Prior migrations, including the cost-center catalog, must already exist. Do not
rerun migration 001 on an existing database. If 011 fails, its transaction rolls
back all changes; resolve the reported duplicate/dependency issue and rerun it.
Do not add only `is_deleted`, remove the soft-delete predicate, or reset tables:
those workarounds omit required auditing/uniqueness or lose data.

Budget routes check migration readiness before querying domain tables and return
503 with code `schema_not_ready` and the required migration when schema elements
are absent. The frontend displays a safe, actionable upgrade message and blocks
creation. This avoids the missing-column query and its secondary PostgreSQL
pipeline-abort errors; it does **not** silently migrate production or bypass
soft-deletion. Readiness is not cached, so the next request after a successful
migration works without restarting. A backend/frontend rebuild is needed only
to deploy this diagnostic patch itself.

Verification covers all six operations before migration 011, successful CRUD
after upgrade in the same process, missing audit columns/indexes and BFF/browser
rendering of the upgrade instruction. No deployment against your remote/local
backend database is performed by the repository tests.

## Authenticated API

Every backend route uses `TenantJwtAuthFilter`, including its live tenant/user
checks. Tenant and audit actor come from JWT identity, never request fields.
There is no new budget-specific role policy. Active, nondeleted accounting units
must belong to that tenant. Records cannot be moved between tenants/units.

| Method | Backend route | Request / result |
| --- | --- | --- |
| GET | `/api/v1/ledger/budgets` | Query `accountingUnitId`; `{data,totalCount}` including complete monthly details |
| GET | `/api/v1/ledger/budgets/options` | Same query; `{accounts,costCenters}` |
| GET | `/api/v1/ledger/budgets/{id}` | Same query; single header and monthly details |
| POST | `/api/v1/ledger/budgets` | Body `accountingUnitId`; create a draft (201) |
| PUT | `/api/v1/ledger/budgets/{id}` | Body `accountingUnitId`; partial header merge / replacement monthly set (200) |
| DELETE | `/api/v1/ledger/budgets/{id}` | Query `accountingUnitId`; soft delete header and live details (200) |

The Nuxt BFF mirrors these under `/api/ledger/budgets`, unwraps `{success,result,error}`
and returns successful results as 200. It forwards the session bearer on **every**
CRUD/lookup call, keeps the token server-side, sets `Cache-Control: no-store`, checks
mutation origins, disables retries and sanitizes error messages. Backend codes:
validation=400, unauthorized=401, forbidden=403, not found/out-of-scope/deleted or
inactive unit=404, duplicate/non-draft/composite-reference conflict=409,
database/commit failure=503. Query/body scope mismatches are rejected.

```json
{
  "accountingUnitId": "30000000-0000-4000-8000-000000000001",
  "accountId": "50000000-0000-4000-8000-000000000001",
  "costCenterId": null,
  "organizationUnitId": null,
  "beginDate": "2026-01-01",
  "endDate": "2026-02-01",
  "details": [
    { "year": 2026, "month": 1, "budgetAmount": "1200.123456", "revisedAmount": "0" },
    { "year": 2026, "month": 2, "budgetAmount": "1200.123456", "revisedAmount": "50.000001" }
  ]
}
```

### Contract and safety

- `accountId` must be a live, active GL in this tenant/unit. `accountName` is a
  verified server-derived snapshot; account number comes from the live GL.
- Optional `costCenterId` must be live and in this tenant. Cost centers are
  tenant-wide, not unit-owned. Null, empty string or Guid.Empty clears it.
  Existing cost-center CRUD already protects live budget references.
- There is **no organizational-unit catalog in the database**. New assignments
  are rejected rather than storing demo UUIDs. Create accepts omitted/null/empty
  organizational unit. Update preserves existing legacy ID/name when omitted,
  or explicitly clears both on null/empty/Guid.Empty. Even supplying an existing
  nonnull ID is rejected: this endpoint cannot validate organizational catalog
  membership. Names are never client-editable. Copying creates an unassigned
  draft, not a new fake/legacy organizational assignment.
- Dates are monthly bounds `YYYY-MM-01`, not arbitrary daily bounds. Both bound
  months are included; years 1900–2999; 1–60 periods. A supplied `details` array
  must contain exactly one entry for every month, no duplicates/extras/gaps.
  Month/year must be JSON integers. Both amounts are required on every line.
- Amounts are **decimal strings**, not JSON numbers: nonnegative, up to 14 integer
  and 6 fractional digits (`numeric(20,6)`). No exponent, sign, whitespace or
  leading-zero coercions. Maximum `99999999999999.999999`; SQL returns exact
  six-decimal strings. UI allocation, totals and percentages use BigInt-scaled
  micro-units, never Number-based monetary math. Equal allocation distributes
  residual micro-units without negative periods or changing the total. Percentage
  conversion rounds half up once at 6 decimals and rejects overflow.
- PUT may omit unchanged headers/details. Supplied details replace the **live**
  period set. If dates change, the resulting set must cover the new bounds.
  Retained period IDs/creation audit remain stable; removed periods are audited
  soft deletes. Re-added periods receive new IDs, never restore deleted rows.
- Header and all detail changes commit together; response follows the awaited
  commit callback. Validation, SQL and non-SQL failures explicitly roll back.
  Unit/header/selected GL/cost-center locks protect reference checks and writes.
  Scope-level unit locking serializes cooperating ledger mutations; there is no
  optimistic version token (concurrent edits are serialized, last writer wins).
- Submitted, approved and closed budgets are readable but not editable/deletable.
  Only drafts can change. A live composite referencing a draft blocks both edit
  and deletion. Deleted composites do not block. Approval/status-transition
  workflow is **not** implemented by these CRUD routes; optional input status
  may only be `draft`.
- Client tenant IDs, header/detail UUIDs, display names, audit, role and deletion
  fields are rejected. Detail response IDs are read-only and must be omitted
  from writes. Reads filter both the live scoped parent and `details.is_deleted=false`;
  writes never manipulate previously deleted history.

The page includes unit selection, search/status/year filters, monthly expansion,
create/edit/copy/delete, exact allocations to either budget/revised amounts,
individual period entry and approved/closed prior-year copying with a percentage.
Prior-year sources must match account, cost center and organizational scope within
the current unit, with exactly one source for each requested prior month. Loading,
mutation errors, cancellation, mobile scrolling and readonly states are handled;
no fake records or lookup fallbacks remain.

## Verification

- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run build`
- `node --experimental-strip-types test/ledger/budget_amounts_test.mjs`
- `BUDGET_TEST_DATABASE_URL='...' JSONCPP_SOURCE_DIR='...' LIBPQ_LIB_DIR='...' bash test/budgets/run_pg.sh`
  (optional `BUDGET_TEST_SANITIZERS='-fsanitize=address,undefined -fno-omit-frame-pointer -g'`).
  Requires a **disposable PostgreSQL database**; creates/drops `budget_test` schema.
  Runs actual migrations and production Budget/CostCenter services through the
  synchronous coroutine/libpq transport seam, including a real competing NOWAIT
  connection, rollback injection, exact precision and clean/history-conflict
  migration rollback checks.
- `BANK_BROWSER_DEPS='path-to-playwright-core-and-@sparticuz/chromium' node test/ledger/budgets_http_test.mjs`
  after a frontend build (platform Chromium libraries may need `LD_LIBRARY_PATH`).
  BFF/session/bearer/scope/error tests and optional real Chromium page CRUD use a
  strict mock upstream, **not a live Drogon/JWT deployment**.

The C++ service/controller also pass syntax checks against real Drogon 1.9.5,
Trantor and JsonCpp headers. These checks do not constitute a full backend link
or a deployed end-to-end smoke test.
