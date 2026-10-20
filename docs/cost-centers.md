# Cost centers

Apply `database/migrations/007_cost_centers.sql` after migrations 001–006,
then rebuild/restart the C++ backend and Nuxt frontend. The matching `.down.sql`
drops the directory and all its audit/history rows; use only when intentionally
rolling back this feature.

## Ownership and model

`core_cost_centers` is a **tenant-owned** hierarchy, independent of accounting
units. It follows the supplied C# CostCenter model: UUID `id`, nullable UUID
`parent_id`, `name`, `tenant_id`, plus full creation/modification/deletion audit
columns. Tenant IDs are UUIDs to match this repository rather than the C# integer
type. Root centers have `parent_id=NULL`; API input also accepts an empty string,
omitted parent or `Guid.Empty` as a root, and normalizes output to null.

Name is required, trimmed, 1–160 bytes. Only `name` and `parentId` are accepted
in request bodies. IDs, tenant/scope, audit fields, nested children and soft-delete
flags cannot be client-controlled. Name uniqueness is case-insensitive among
live siblings, including top-level siblings; the same name is allowed under a
different parent or in another tenant. Deleted sibling names can be reused.

A composite foreign key enforces same-tenant parent relationships. Service
validation also requires a live parent, rejects self/descendant parenting and
uses UUID comparison (including uppercase UUID input) for cycle checks. Recursive
ancestor SQL uses UNION to terminate safely on malformed legacy cycles.

Every data read/update/delete includes `tenant_id` from the verified JWT and
`is_deleted=false`. Host credentials cannot be used as a tenant session. A
foreign-tenant record ID returns 404; a foreign/missing/deleted parent is invalid.

## API

All routes use `TenantJwtAuthFilter` and the standard `{success,result,error}`
response envelope:

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/v1/shared/cost-centers` | Complete live tenant hierarchy |
| GET | `/api/v1/shared/cost-centers/{id}` | One live tenant cost center |
| POST | `/api/v1/shared/cost-centers` | Create root or child (201) |
| PUT | `/api/v1/shared/cost-centers/{id}` | Replace name and parent (200) |
| DELETE | `/api/v1/shared/cost-centers/{id}` | Audited soft deletion (200) |

Example create/PUT:

```json
{"name":"Finance","parentId":"a0000000-0000-4000-8000-000000000001"}
```

Use `parentId:null` for top level. PUT is replacement, not PATCH: omitted parent
moves the center to top level. Records contain `{id,name,parentId}`. List returns
`{data,totalCount}` with **all** live centers, not a partial page, so children do
not lose parents at pagination boundaries. Search is performed client-side with
ancestor context; the list API does not implement server-side query/pagination.

Validation=400, unauthenticated/wrong token scope=401, missing/deleted or
foreign-tenant row=404, duplicate sibling name / children or financial references
preventing deletion=409, DB/commit error=503. Other successes=200.

Mutations run in a transaction and acquire the live tenant row's `FOR UPDATE`
lock before checking/modifying the hierarchy. All cost-center mutations for one
tenant serialize, preventing concurrent reparent/delete operations from making
cycle/leaf checks stale. Different tenants retain separate lock scopes. The
service awaits commit before reporting success; all audit actor fields come from
the verified identity. Values are bound parameters, not SQL interpolation.

Deletion requires no live children (move/delete them first). Financial deletion
guards cover the existing schema's four cost-center dimensions: all account
balances, live budgets, live journal lines and lines belonging to live cash
receipts. Deleted dependencies are ignored where the schema provides soft-delete
fields. Cash receipt lines have no own soft-delete field, so their parent receipt
status determines liveness. No physical deletion of directory rows occurs.

These checks do not retrofit locks/validation into all existing financial writers
or add foreign keys to legacy arbitrary dimension UUIDs. They protect deletion
against committed references, but financial-posting/delete concurrency still
needs coordinated writer validation. This feature does not add cost-center
pickers to unrelated posting forms or rewrite historical dimensions.

## Frontend

**Shared config → Cost Centers** opens `/ledger/shared-config/cost-centers`,
replacing its placeholder. It uses Account Heads' hierarchy builder/search and
visual design: summary cards, green primary action, parent-before-child rows,
indentation, initial icons, parent/child-count columns, per-row actions and
responsive/dark styling. No artificial active/status field is added to the model.

- Add top-level centers or use a row's **Add child** action to preselect its parent.
- Edit reloads the record and complete tree before showing parent choices.
- The parent selector excludes the edited node and all its descendants; the
  backend independently validates the same rule.
- Search retains ancestors and shows matching subtrees for context.
- Rename and reparent (including moving a subtree to top level) are supported.
- Delete requires confirmation; parents with children have disabled deletion
  controls, while the backend also guards children/references against stale UI.
- Loading, error, refresh and empty states are connected to real responses.

Nuxt exposes the same routes under `/api/shared/cost-centers`, forwards the tenant
bearer on every call, uses existing ledger/auth backend origins and unwraps
successful responses as 200. Browser URLs are relative, tokens remain HttpOnly,
responses are `no-store`, origin checks protect mutations and upstream errors
are sanitized. Host cookie/token scope cannot substitute for tenant sign-in.

## Verification

- Frontend typecheck/build.
- `test/cost_centers/run_pg.sh`: actual service SQL against PostgreSQL through
  the synchronous coroutine/DB transport seam. Tests tenant isolation, roots,
  multi-level parenting, cycles (including uppercase UUID input), uniqueness,
  parent options' backend rules, auditing, soft deletion, financial guards,
  rollback/commit failure and a second connection's exclusion by the tenant lock.
- `node test/ledger/cost_centers_http_test.mjs`: built Nuxt/strict fake backend;
  all CRUD, token forwarding, errors, origin protection and SSR. With the existing
  external Playwright setup (`BANK_BROWSER_DEPS`), also checks hierarchy indentation,
  ancestor-preserving search, descendant exclusion from parent choices, browser
  root/child creation, editing/reparenting and deletion.
- Existing Account Heads hierarchy, ledger, bank, currency and System numbers
  HTTP/browser regression tests.
- Actual Drogon 1.9.5 header syntax checks and focused ASan/UBSan service tests.

Use a **disposable database** for the service test: it creates/drops the entire
`cost_center_test` schema, including any preexisting contents.

```sh
COST_CENTER_TEST_DATABASE_URL='host=127.0.0.1 port=5432 user=test dbname=disposable' \
JSONCPP_SOURCE_DIR=/path/to/jsoncpp LIBPQ_LIB_DIR=/path/to/libpq \
bash test/cost_centers/run_pg.sh
```

Optional `COST_CENTER_TEST_SANITIZERS`:
`-fsanitize=address,undefined -fno-omit-frame-pointer -g`.
Tests do not constitute a full live Drogon HTTP/JWT/PostgreSQL deployment or
comprehensive concurrent financial-posting verification.
