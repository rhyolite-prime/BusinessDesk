# Tenant-wide ERP preferences and business-data initialization

## Deployment

Apply migrations through **015**, including the existing journal/period upgrades,
to the same database and explicit schema/search path used by the backend:

```sh
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f database/migrations/015_tenant_preferences.sql
```

Rebuild/restart backend and frontend. Missing tables/functions return
`schema_not_ready` / 503 and the page names migration 015. No runtime DDL is
performed. For a custom schema, set the migration connection's `search_path`
explicitly to that schema; the reset functions capture that search path.

The backend database role needs normal SELECT/INSERT/UPDATE/DELETE privileges
and EXECUTE on `tenant_reset_snapshot(uuid,text[])` and
`tenant_reset_apply(uuid,uuid,uuid,text)`. These are **SECURITY INVOKER**, not
privilege-escalating SECURITY DEFINER functions. Never expose a privileged DB
role or arbitrary SQL/function RPC directly to tenant browsers. Tenant identity
is always supplied by the JWT-authenticated C++ service, never by request JSON.

The down migration permanently drops preferences, plans, limits and their audit
history. Export/backup first, stop writes and deploy a compatible application
version when downgrading. It is not a repair script.

## Preferences

Open **Configuration → Preferences** (`/preferences`). Every live tenant user
can read tenant preferences; only a live, active, unlocked **tenant
administrator** can save settings, preview/execute initialization or view its
history. Host administrators do not gain tenant reset access through this API.
The backend checks database flags on every request, and locks/rechecks user and
tenant status for mutations. Client role/tenant/actor fields are rejected.

Supported settings are deliberately connected to actual consumers:

- Display locale: `en-GH`, `en-GB`, `en-US`, `fr-FR`, `de-DE` (formatting, not UI
  language translation).
- IANA time zone, date style and 12/24-hour clock for shared date/time formatters.
  Accounting date-only strings remain on the same calendar date.
- Currency **display** decimals (0–6), grouping and number/percent locale for
  shared `useFormat` consumers. Fixed-precision journal controls and backend
  calculations are intentionally unchanged.
- A4/Letter paper and portrait/landscape defaults through the application print
  stylesheet; explicit browser/printer/report-specific overrides may still apply.

Settings are tenant-persisted, optimistic-versioned and audited. They are loaded
for the authenticated session; logout/identity changes clear cached settings,
and late/stale responses cannot replace a newer saved version. Existing shared
formatting defaults remain available if the preferences service is unavailable.

Company identity, currency/fiscal/tax configuration remain authoritative in
Company Profile and Accounting Units; authentication/authorization remain in
existing administration screens. No cosmetic, unenforced approval, tax or
security-policy toggles are introduced.

## Initialization safeguards

**This is permanent deletion of training/test business data, including posted
transactions. There is no undo, recycle-bin restore or automatic backup. Take
and verify a database backup first and use a maintenance window.**

The operator may select individual installed tables, complete module groups, or
all reviewed tenant business tables. The preview expands dependencies and shows
every affected table and count **including archived/soft-deleted business
records**. This is the expressly approved exception to normal live-only query
rules; ordinary reads/mutations still filter `is_deleted=false`.

Always retained:

- Tenant identity and other tenants' data.
- Company Profile, including its encrypted mail settings and currency reference.
- Users, roles, groups, credentials, MFA/security records.
- Preferences, preference change history, reset plans, rate limits and reset audit.
- Shared/global catalogs such as currencies and host system-number templates.

The registry explicitly lists reviewed tables installed by the current GL/core
schema. Nonexistent modules are not advertised. Future HR/payroll/inventory or
other real tenant tables must be reviewed and registered in a migration before
they can be initialized. An **all-tenant reset fails closed** if an unreviewed
tenant table exists; it never silently claims to have cleared that table.
Security tables in `auth_*` and preferences infrastructure in `core_tenant_*`
are reserved protected namespaces. Registry constraints also prohibit adding
company profile, identity/access or global currency tables as reset targets.

Dependency handling:

- FK children are added before their parent can be removed.
- Financial transaction tables, balances, reconciliation, posting snapshots,
  sequence counters and related cash/imprest data reset as one coherent group.
- Resetting cost centers also includes ledger tables with organizational links
  that cannot be inferred solely from foreign keys.
- No `TRUNCATE`, `CASCADE` command, global sequence restart, blanket schema wipe
  or tenant recreation is used. Every DELETE is `FROM ONLY <reviewed table>
  WHERE tenant_id = <authenticated tenant>`.
- Inbound references into another tenant, protected/unreviewed children,
  unsupported cycles, partitions/inheritance, RLS policies or custom DELETE
  triggers block initialization. Even existing database ON DELETE CASCADE/SET
  NULL rules cannot be allowed to mutate an unselected/protected/foreign-tenant
  row: children are included, cross-tenant links are checked and tables locked.
- Non-relational references in future modules require explicit registry/cohesion
  review; the engine cannot infer arbitrary references inside JSON or application
  code. Do not register future modules without reviewing these relationships.

### Confirmation and execution

1. Select the intended scope and **Preview initialization**. Changing selection
   discards the preview/confirmation/password.
2. Review automatically added dependencies and all record counts.
3. Provide a reason, type exactly **`RESET <accountId>`**, and enter the current
   administrator password. Passwords are never saved in preferences or audit.
4. Execute once and wait for completion. Do not refresh/close the page mid-reset.

Plans expire after five minutes and belong to one tenant **and one user**.
Execution revalidates the live administrator/password, locks the plan and
recomputes the data/dependency snapshot under locks. SHA-256 content fingerprints
catch edits even when row counts do not change. Used, expired or stale plans
require another preview. A nonce and unique completion audit prevent replay.

Reauthentication permits at most five attempts per administrator/tenant per
15-minute window, including successful execution requests. Wrong passwords and
known rejected executions are audited without credentials. Validation and
infrastructure errors are not guaranteed an audit row if no valid operation
started or the database is unavailable. The page shows the latest 25 recorded
attempts with full name/email, timestamp, status, reason and affected counts.

DELETEs, nonce consumption and completion audit commit in a single transaction.
FK errors, timeouts and failed commits roll back the entire reset. If the
response/commit acknowledgment is lost, **review history before retrying**;
never infer completion from a timeout. Reusing a committed plan does not erase
newly entered business data.

### Operational limits

The operation takes ordered SHARE ROW EXCLUSIVE locks on installed registry
tables to stabilize snapshot/dependencies and prevent racing business writes.
These locks temporarily block writes in other tenants as well, although their
records are never deleted. Normal business writes should be stopped first.
Lock wait is bounded to 5 seconds and each database operation to 60 seconds;
the frontend proxy permits 90 seconds. Deadlock/timeout fails without a partial
reset. No schema migrations or database configuration changes should run
concurrently with initialization.

A table with more than **100,000 target-tenant records** requires an
operator-assisted reset instead. The UI does not silently truncate previews or
perform background batches with partial commits. No background purge of
preserved audit/history is implemented; retention needs an explicit future
policy. Global/host rows with NULL tenant IDs are never reset.

## HTTP API

Backend routes use `TenantJwtAuthFilter`; Nuxt proxies validate the session,
forward its bearer token on every call, reject cross-origin writes, use
`Cache-Control: no-store`, sanitize backend failures and do not retry resets.

| Method | Backend path | Input |
| --- | --- | --- |
| GET | `/api/v1/preferences` | None; returns settings/version/canManage/accountId and admin-only installed table catalog |
| PUT | `/api/v1/preferences` | `{version, settings}` (full supported settings object) |
| POST | `/api/v1/preferences/reset/preview` | `{scope:"selected", tables:[...]}` or `{scope:"all",tables:[]}` |
| POST | `/api/v1/preferences/reset/execute` | `{planId, password, confirmation, reason}` |
| GET | `/api/v1/preferences/reset/history` | None; admin-only latest 25 events |

Equivalent frontend paths omit `/v1`. Responses follow `BaseApiResponse`; Nuxt
unwraps `result`. Validation is 400, missing authentication/wrong reauthentication
401, insufficient administrator access 403, stale/blocked/reused preview 409,
reauthentication rate limit 429 and schema/database/commit errors 503. No tenant
or scope override can be supplied by a client.

## Verification

```sh
npm --prefix frontend run typecheck
npm --prefix frontend run build
node --experimental-strip-types test/preferences/format_test.mjs
PREFERENCES_TEST_DATABASE_URL='postgresql://...' \
  JSONCPP_SOURCE_DIR='/path/to/jsoncpp-with-dist' LIBPQ_LIB_DIR='/path/to/libpq' \
  PREFERENCES_PG_DEPS='/path/to/node-pg-install' \
  PREFERENCES_TEST_SANITIZERS='-fsanitize=address,undefined -fno-omit-frame-pointer' \
  bash test/preferences/run_pg.sh
JOURNAL_BROWSER_DEPS='/path/to/playwright-core-and-@sparticuz/chromium' \
  node --experimental-strip-types test/preferences/http_browser_test.mjs
```

Use a **disposable PostgreSQL database**: setup drops/recreates `preferences_test`.
The SQL suite compiles/runs production PreferencesService and JournalService
with real PostgreSQL, real bcrypt and the synchronous coroutine/libpq transport
seam. It tests migration up/down/up, real posted financial data, role/scope guards,
versioning, password checks/rate limits, plan ownership/expiry/replay/content
staleness, dependency expansion, cross-tenant cascade blockers, preservation,
custom triggers/RLS/unknown tables, commit rollback and real lock contention.
The native services/controller also pass syntax checks against current Drogon,
Trantor and JsonCpp headers; this is not a full production backend link/deployment.

HTTP/browser tests run the built Nuxt app and real Chromium against a controlled
mock upstream, testing proxy auth/origin/error handling, settings persistence,
print consumption, preview/dependency display, password and confirmation guards,
stale plans, reset completion/audit UI, cancellation, read-only users and mobile
layout. The separate formatter suite tests shared locale/time-zone/precision
consumers, including non-shifting accounting dates.
