# System numbers

## Ownership and provisioning

Host administrators manage templates at `/host/system-numbers`. The host layout
links to both Currencies and System numbers; the existing independent host login
at `/host/login` and `bd_host_access` HttpOnly cookie are reused. Every host CRUD
request requires a verified host JWT and a live, active, unlocked, nondeleted
host-admin user. Ordinary host accounts cannot manage templates.

Tenant users access **Shared config → System numbers** at
`/ledger/shared-config/system-numbers`. Their session uses the separate tenant
cookie/JWT. They can list, read and edit their own copies only. Create and delete
are explicitly denied with 403 by both the backend and BFF; hiding buttons is not
the authorization boundary. Host template CRUD cannot target tenant-copy IDs.

`core_system_numbers` has nullable UUID `tenant_id`: NULL identifies a host
template, while a tenant UUID identifies a tenant-owned snapshot. This adapts
the supplied C# `IMustHaveTenant` model to the repository's UUID tenant IDs and
adds the host-template scope. Tenant rows have a server-set `source_template_id`
for provenance. Clients cannot set either scope field or any audit field.

Tenant creation's existing atomic data-modifying CTE now also copies **all live
host templates**, including the current `last_no`, into distinct UUID rows for
the new tenant. The provisioning host actor is recorded in the copies' creation
audit. A failure in any copy, admin, role or tenant insert rolls back the entire
statement. Copies use the statement's consistent snapshot of committed templates.

Host updates affect future tenants only. Host soft deletion excludes a template
from future provisioning, but existing copies stay readable/editable. Tenant
changes do not affect host templates or other tenants. New templates do not get
added retroactively to existing tenants, and this change does not backfill
existing tenants. Existing tenants may therefore have an empty System numbers
screen; new tenants receive whichever templates exist at creation time.

## Deployment

Apply `database/migrations/006_system_numbers.sql` after migrations 001–005,
**before** starting the updated backend: tenant creation now depends on this
table. Rebuild/restart the backend and frontend. No built-in numbering templates
or invented module-ID mappings are seeded; host operators configure their real
module IDs and keys.

The matching `.down.sql` destroys the entire catalog and copies. Roll back the
application's provisioning SQL before dropping the table.

## Fields and validation

Create and PUT require exactly these eight editable fields; tenants may edit
these same fields on an existing copy:

```json
{
  "moduleId": 1,
  "itemName": "Journal voucher",
  "key": "JOURNAL_VOUCHER",
  "prefix": "JV-",
  "suffix": "",
  "formatPattern": "{PREFIX}{NO}{SUFFIX}",
  "padding": 5,
  "lastNo": 0
}
```

- `moduleId`: nonnegative 32-bit integer; no invented enum mapping.
- `itemName` and `key`: trimmed, nonblank strings, max 100 bytes.
- `prefix` and `suffix`: strings, max 100 bytes, may be empty; spaces preserved.
- `formatPattern`: trimmed string, max 50 bytes, exactly one `{NO}`. Optional
  `{PREFIX}` / `{SUFFIX}` tokens and literal separators are accepted. Unknown,
  malformed or differently-cased brace tokens are rejected.
- `padding`: integer 0–18 (minimum displayed numeric width, not truncation).
- `lastNo`: nonnegative 32-bit integer, maximum 2,147,483,647.
- Nulls, unexpected fields, client IDs/scope/audit flags and embedded NULs are
  rejected. `(moduleId, key)` is unique case-insensitively within the live host
  scope and separately within each tenant. Deleted host keys can be reused.

Records expose `id` plus the eight camelCase fields. Source/audit/scope fields
are not editable or taken from browser JSON. Full create/update/delete auditing
is persisted using JWT identity; host deletion is soft deletion. All data reads
and writes explicitly scope `is_deleted=false`, including host-admin verification.
Writes are transactional and report success only after commit; update/delete
lock their scoped live row. SQL values are parameterized. Pagination uses explicit
64-bit binary bindings/casts for PostgreSQL LIMIT/OFFSET.

## APIs

Standard `{success,result,error}` backend envelope:

| Method | Host path | Tenant path |
| --- | --- | --- |
| GET | `/api/v1/host/system-numbers` | `/api/v1/shared/system-numbers` |
| GET | `/api/v1/host/system-numbers/{id}` | `/api/v1/shared/system-numbers/{id}` |
| POST | `/api/v1/host/system-numbers` | Denied (403) |
| PUT | `/api/v1/host/system-numbers/{id}` | `/api/v1/shared/system-numbers/{id}` |
| DELETE | `/api/v1/host/system-numbers/{id}` | Denied (403) |

List: `pageNo` (1–1,000,000), `pageSize` (1–200, default 20), `query` (up to 100
bytes; literal case-insensitive item-name/key substring). Results contain
`data,totalCount,totalPages,pageNo,pageSize`. Invalid data=400, unauthenticated or
wrong token scope=401, disallowed operation/host privilege=403, missing/deleted or
foreign-scope row=404, duplicate key=409, DB/commit error=503. Backend create=201;
other successes=200.

Nuxt mirrors these paths without `/v1`, unwraps successful bodies and returns
200, as in existing ledger adapters. Every upstream call includes its appropriate
bearer token. Host requests use the existing host-admin session verification;
no host/tenant token interchange or browser token exposure. Responses are
`no-store`, writes enforce the existing origin protection, retries are disabled
and upstream errors are sanitized. Backend origins use the existing ledger/auth
runtime configuration.

## UI and numbering boundary

The app-design-system table provides server search/pagination, refresh, edit
forms, errors/loading/empty states, host create/delete dialogs and explicit tenant
edit-only copy messaging. Fields and limits follow the API. Host deletion warns
that existing tenant copies remain unchanged.

The preview substitutes `lastNo + 1`, zero-padded to `padding`, into the format.
It is **preview only**: no number is allocated, incremented or reserved. This
feature does not wire numbering into journal/voucher posting, enforce global
identifier uniqueness, or implement concurrent sequence allocation. Editing the
last number can reuse identifiers; the form warns about that risk. At the int32
maximum, the preview is not an allocatable int32 counter value.

## Verification

- Frontend typecheck/build.
- `test/system_numbers/run_pg.sh`: production service code with the synchronous
  coroutine/DB transport seam connected to real PostgreSQL via libpq. Covers host
  privilege, tenant/host isolation, edit-only policy, validation, binary pagination,
  uniqueness, auditing, rollback/commit failure and independent snapshots.
- `node test/tenants/sql_test.mjs /path/to/@electric-sql/pglite/dist/index.js`:
  real provisioning SQL on PostgreSQL/PGlite with model-derived tenant/user/role
  schema; tests template cloning and forced-copy-failure rollback of provisioning.
- `node test/ledger/system_numbers_http_test.mjs`: built Nuxt and strict fake
  upstream; scoped CRUD, token forwarding, copy restrictions, origin protection,
  sanitized errors and SSR. Optional `BANK_BROWSER_DEPS` enables the same external
  Playwright/Chromium setup as bank tests, covering host create/edit/delete and
  tenant edit-only behavior in the browser.
- Existing currencies, banks/branches, ledger HTTP, hierarchy and tenant suites.
- Actual Drogon 1.9.5 header syntax checks and focused ASan/UBSan service tests.

The live PostgreSQL service runner creates/drops a **disposable**
`system_number_test` schema; never point it at production. Example:

```sh
SYSTEM_NUMBER_TEST_DATABASE_URL='host=127.0.0.1 port=5432 user=test dbname=disposable' \
JSONCPP_SOURCE_DIR=/path/to/jsoncpp LIBPQ_LIB_DIR=/path/to/libpq \
bash test/system_numbers/run_pg.sh
```

Optionally set `SYSTEM_NUMBER_TEST_SANITIZERS` to
`-fsanitize=address,undefined -fno-omit-frame-pointer -g`.
No full live Drogon HTTP/JWT/DB deployment or concurrent allocation testing is
claimed by the transport-seam and mock-upstream tests.

## Host: sync templates to an existing tenant

On **Host → System numbers**, use **Sync system numbers to a tenant**. Search
for an organization/account ID, select it, choose a mode, and type `SYNC`.

- **Override by module and key**: case-insensitive key matching within a module;
  overwrite all numbering fields (including `lastNo`), preserve matching IDs,
  and copy missing host templates. Archived copies are restored. A source copy
  whose key was renamed is reset to its host template when the host key is
  missing. Other tenant-only entries are retained.
- **Hard-delete all and recreate**: permanently remove every system-number row
  for the selected tenant, including soft-deleted rows, then insert fresh UUIDs
  from live host templates. This does not delete business documents.

**Warning:** both modes copy the host's Last No. This may reuse previously
issued numbers. Verify counters before posting new documents. Hard replacement
cannot be undone through the application.

`POST /api/v1/host/system-numbers/sync` accepts exactly:
`{"tenantId":"<uuid>","mode":"override|replace","confirmation":"SYNC"}`.
The same-origin frontend proxy is `POST /api/host/system-numbers/sync`.
Only a live, active, unlocked host administrator can invoke it. Tenant identity
cannot invoke the service. The selected tenant must not be deleted. No tenant
or audit identity is taken from client-provided credentials.

The operation uses one transaction, locks the target tenant and the numbering
table against concurrent template/counter writes, and awaits commit. Empty host
templates refuse either mode (especially preventing accidental destructive
replacement). Errors roll back the entire operation. Responses report
`tenantId`, `mode`, `updated`, `copied` (inserted/restored/reset source copies),
and `deleted` (hard-deleted rows). Created/modified actor fields use the host
administrator's authenticated ID. Unique conflicts are returned without partial
changes. No database migration is required.

Regression: `test/system_numbers/run_pg.sh` runs real PostgreSQL transaction,
authorization, key override, archived restoration, tenant isolation, replacement,
empty-template protection and commit-rollback checks.


### Selective sync and multiple tenants

The host sync form now supports selecting one or more tenants (use the native
multi-select controls) and choosing **All host templates** or **Specific system
numbers**. Specific mode shows all active host templates, loaded across every
page, with module name, item name and key. Check at least one template. Changing
the tenant, mode, scope or template selection clears the typed confirmation.
Search changes clear the tenant selection to avoid syncing hidden accounts.

Selective sync always uses **Override by module and key**. Nonselected templates
and unrelated tenant rows are untouched. Hard replacement is available only in
All host templates mode. Empty, duplicate, malformed, archived, non-host or
unavailable template IDs are rejected before any numbering changes are made.
The endpoint accepts an optional `templateIds` UUID array (1–1000 entries) in
addition to the existing fields. Omit it to sync all templates; an empty array
is never interpreted as all. Partial selection with `replace` is rejected.

Multiple tenants are processed individually and results are shown per tenant,
including failures. Each tenant operation is atomic; the batch is not a shared
transaction. A failure for one tenant does not undo successful syncs for others.
Do not blindly retry successes: host Last No values are copied on every sync.
