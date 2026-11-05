# Imprest categories CRUD

## Deployment

Apply `024_imprest_categories.sql` after existing ledger migrations (through 023)
before deploying this code. The existing `gl_imprest_categories` table is reused;
no demo rows or new category table are seeded. Migration 024 adds a positive row
version, live case-insensitive name uniqueness per tenant/accounting unit, and
live tenant/unit checks for category links on imprests and default GL mappings.

Back up before deployment. Existing case-insensitive duplicate live names cause
the migration to fail atomically: resolve them deliberately, rather than silently
renaming business data. Rollback restores the original uniqueness rule, which
also covers deleted rows; exact archived-name reuse may require cleanup first.
The pulled generated ORM files are preserved; the new service uses SQL projections.
No application database was changed during development.

## API

All routes require `TenantJwtAuthFilter` and a live, unlocked tenant user. Tenant
and audit actor come from the JWT, not client payloads. Host-only access is denied.

| Method | Route | Body/query |
| --- | --- | --- |
| GET | `/api/v1/ledger/imprest-categories` | Required query `accountingUnitId` |
| GET | `/api/v1/ledger/imprest-categories/{id}` | Detail |
| POST | `/api/v1/ledger/imprest-categories` | `{ "name": "Travel", "accountingUnitId": "<UUID>" }` |
| PUT | `/api/v1/ledger/imprest-categories/{id}` | `{ "name": "Operations", "version": 1 }` |
| DELETE | `/api/v1/ledger/imprest-categories/{id}` | `{ "version": 2 }` |

List returns `{ data, totalCount }` in the existing API result envelope, sorted by
name; each record contains `id`, `name`, `accountingUnitId`, and `version`.
Names are trimmed, nonempty, and limited to 160 UTF-8 bytes. Unit changes are not
accepted on existing categories; create another category in the desired unit.
Tenant, audit, deletion, and other extra fields are rejected on writes.

Creates validate and lock a live tenant-owned active unit. Updates/deletes lock
the category and require its current version. All writes are transactional, audit
the current user, and report commit failure. Ordinary reads filter deleted rows;
delete is soft deletion. A live imprest or default GL mapping blocks deletion.
Reference triggers lock the live category with `FOR SHARE`, preventing a new link
from racing with soft deletion. Archived references do not prevent deletion.

Validation/unauthorized/forbidden/not-found/conflict/unavailable map to HTTP
400/401/403/404/409/503. Nuxt proxies the same routes at `/api/ledger/...`, forwards
the session bearer token on every call, checks write origins, disables caching,
and bounds error messages instead of exposing database internals.

## Frontend

`/ledger/imprest-categories` retains the existing directory design, statistics,
search, and add/edit/delete modals. Select a real accounting unit first. Editing
loads persisted detail, and saving/deleting sends row versions. Busy states,
visible errors, reload/retry, and the shared accessible modal are supported.
Changing unit or session clears stale lists and dialogs; late responses cannot
populate another scope. No local fake category IDs or demo mutation fallback
remain. The legacy `useLedgerSetup().imprestCategories` adapter now reads these
real unit-scoped categories, so existing category selectors also use real data.
This does not implement posting/CRUD for imprest transactions themselves.

## Verification

- `test/imprest_categories/run_pg.sh`: actual PostgreSQL/domain-service tests
  with the repository's synchronous coroutine transport seam; CRUD, audit,
  scope, user/unit eligibility, validation, uniqueness, stale versions, financial
  reference protection, archived references, migration round-trip, and failed
  commit rollback. Supports `IMPREST_TEST_SANITIZERS`.
- `test/imprest_categories/setup_pg.mjs`: 024 up/down/up against the actual
  ledger schema through 023, in a destructive disposable test schema only.
- `test/imprest_categories/http_browser_test.mjs`: built Nuxt/BFF + Chromium
  with a controlled authenticated upstream; persisted modal CRUD, unit selection,
  search, stale edits, deletion conflicts, mobile layout, bearer forwarding,
  CSRF/session checks and bounded failures. This is not a fully linked Drogon HTTP
  end-to-end test.
- Frontend typecheck/build and real Drogon-header syntax checks for the new
  service/controller.
