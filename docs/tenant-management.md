# Tenant provisioning and bootstrap

## First-install seed

The existing PostgreSQL identity schema (`tenants`, audited `users`, and `roles`)
from which the checked-in models were generated must already be installed. The
ledger-only migration `001_create_ledger_schema.sql` does not create these identity
tables. This seed does not invent or overwrite an existing production schema.

1. Apply `database/migrations/002_tenant_live_uniqueness.sql`. It adds live,
   case-insensitive tenancy-name uniqueness and per-tenant username/email indexes.
   Resolve any existing duplicates first. Existing global uniqueness constraints
   are not silently removed; a global `username` constraint is incompatible with
   every tenant having an `admin` user and must be reviewed by the schema owner.
2. Choose a strong host password. Produce a bcrypt hash with cost 12 or higher,
   e.g. with Python's `bcrypt` package (password is prompted, not stored in code):

   ```sh
   python3 -c 'import bcrypt,getpass; print(bcrypt.hashpw(getpass.getpass("Host password: ").encode(), bcrypt.gensalt(rounds=12)).decode())'
   ```

3. Open `psql -X` against the application database and supply the seed variables:

   ```text
   \prompt 'Host admin email: ' host_admin_email
   \prompt 'Host admin bcrypt hash: ' host_admin_password_hash
   \i database/seeds/001_default_host.sql
   ```

   Avoid committing these values or passing a plaintext password in shell arguments.
   This is a **first-install-only** script: three plain inserts and two audit
   updates run inside one transaction. It does not validate the email/hash format;
   supply a valid email and bcrypt hash generated as above. There are no procedural
   checks, advisory locks, or `ON CONFLICT` clauses. A duplicate key (including a
   rerun) fails and rolls back rather than overwriting existing accounts. If run
   through an interactive psql session and an error leaves the transaction aborted,
   issue `ROLLBACK;` before continuing. Required tenant fields are explicit so the
   seed does not depend on subscription-column defaults.

The reserved identities are shared with `constants/TenantConstants.h`:

| Record | UUID |
|---|---|
| Default host tenant (`tenancyName=host`) | `00000000-0000-4000-8000-000000000001` |
| Host admin (`firstName=admin`, `lastName=admin`, `username=admin`) | `00000000-0000-4000-8000-000000000002` |
| Host tenant-management role | `00000000-0000-4000-8000-000000000003` |

Configure a strong `custom_config.JwtBearer.JwtSecurityKey` before starting the
application; the checked-in blank value intentionally prevents token issuance.
Sign in through `POST /api/v1/auth/host-login`:

```json
{"usernameOrEmail":"admin","password":"your-operator-chosen-password"}
```

Do **not** supply `accountId` for host login. The host user belongs to the default
tenant in the database but receives **host-scoped claims**, not tenant claims.
Legacy NULL-tenant host accounts remain supported. The seeded host role grants
`tenants.read`, `tenants.create`, `tenants.update`, `tenants.activate`, and
`tenants.delete`. Tenant users cannot authenticate as hosts. The default host
tenant cannot be changed, deactivated, or deleted through these endpoints.

## Endpoints

Every endpoint uses `HostJwtAuthFilter` and requires the indicated permission
(or `tenants.manage`). Send `Authorization: Bearer <host-token>`.

| Method | Path | Permission |
|---|---|---|
| GET | `/api/v1/tenants?pageNo=1&pageSize=20&query=Rhyolite` | `tenants.read` |
| GET | `/api/v1/tenants/{id}` | `tenants.read` |
| POST | `/api/v1/tenants` | `tenants.create` |
| PUT | `/api/v1/tenants/{id}` | `tenants.update` |
| POST | `/api/v1/tenants/{id}/activate` | `tenants.activate` |
| POST | `/api/v1/tenants/{id}/deactivate` | `tenants.activate` |
| DELETE | `/api/v1/tenants/{id}` | `tenants.delete` |

`OPTIONS` preflights return 204. Pagination is 1-based; page size is capped at 200.
All bodies use the existing `BaseApiResponse` envelope. Successful create returns
201; validation/authorization/missing/conflict failures use 400/403/404/409. Database
or internal failures return 500 without SQL, connection strings or credentials.

## Create

```json
{
  "tenancyName": "RhyolitePrimeLtd",
  "name": "RhyolitePrimeLtd",
  "adminEmailAddress": "kwabenaimhotep@gmail.com",
  "connectionString": null
}
```

`tenancyName` accepts 1–64 ASCII letters, digits, `_` or `-`; `host` is reserved.
`name` is required and at most 128 characters. A valid `adminEmailAddress` is
required and normalized to lowercase. `connectionString` is optional/null or a
string of at most 1024 characters. It is stored as metadata; this endpoint does
not create a separate database or switch the application's shared DB connection.

A single atomic PostgreSQL statement creates:
- An active, live, audited tenant.
- A tenant-specific administrator role populated from the configured
  `custom_config.AdminPermissions` system names (including sub-permissions).
- Its first active, unlocked administrator: first name **admin**, last name
  **admin**, username **admin**, the supplied email, tenant-admin=true and
  host-admin=false. User creation auditing records the host actor.

If any insert fails, all three roll back. No orphan tenant or role is retained.
Concurrent duplicate names are protected by the database index and return 409.

The payload deliberately has no password. A cryptographically random 24-character
password is generated, bcrypt-hashed at cost 12, and returned **once** as
`result.temporaryPassword` along with `id`, `tenancyName`, `name`, `adminUserId`,
`adminUsername` and `adminEmailAddress`. Deliver it securely to the administrator;
it is not emailed automatically. It is never returned by list/get/update. Responses
are `Cache-Control: no-store`; ensure proxies/APM do not log provisioning responses.
There is no forced-password-change column/workflow yet; rotate the password via
trusted user-management tooling before normal use. No shared fallback password is
shipped in `UserDto`, so ordinary user updates cannot silently reset passwords.

The new admin signs in at `POST /api/v1/auth/tenant-login` with:

```json
{
  "accountId": "RhyolitePrimeLtd",
  "usernameOrEmail": "admin",
  "password": "the-one-time-provisioning-response-password"
}
```

Use the returned tenancy-name spelling for `accountId` (tenant lookup is exact).
Configure `AdminPermissions` before provisioning: existing roles are snapshots,
not automatically broadened when configuration later changes.

## Update, status and deletion

PUT supports partial updates of the same four fields. Omitted values are preserved;
explicit `connectionString: null` clears it. Updating `adminEmailAddress` changes
the oldest **live tenant-admin** account's email and auditing, not its password,
username, names or role. If no live admin remains, the request fails without
partially updating the tenant. Admin-email failure rolls back the tenant update.

Tenant creation/modification/deletion audit columns use the model's legacy names:
`creation_time`, `creator_user_id`, `last_modification_time`,
`last_modifier_user_id`, `deletion_time`, and `deleter_user_id`. AuditUtil supports
these alongside the newer auditing names used by Users/GL models.

Queries and update predicates always include `is_deleted = false`. Deactivation
sets only activation state (and audit fields); activation never restores a deleted
tenant. Deletion is soft and deactivates the tenant while retaining its users and
ledger references. Tenant login checks tenant status, so new logins stop after
deactivation/deletion. Already-issued JWTs remain valid until expiry: immediate
revocation still requires the separate session/version-check design described in
`user-authentication.md`.

List/get return a safe projection: tenant ID/name/tenancy name, activation, creation
and modification times. Connection strings and billing/account secrets are never
serialized to the API.

## Tests

- `test/users/run.sh`: existing users/GL/JWT regressions, including bootstrap-host
  authentication. Uses in-memory ORM/HTTP seams with real bcrypt/JWT cryptography.
- `test/tenants/run.sh`: service/controller dispatch, authorization, validation,
  generated password hashing, audit stamps, lifecycle and soft-deletion guards.
- `test/tenants/sql_test.mjs`: production provisioning/update SQL, seed and indexes
  executed by PostgreSQL/PGlite (WASM), including rollback and rejection of duplicate seed runs.

Run the C++ harnesses with `JSONCPP_SOURCE_DIR` and `OPENSSL_SOURCE_DIR` set as
explained in `test/users/README.md`. For the SQL tests, install
`@electric-sql/pglite` outside the repository and pass its `dist/index.js` path:

```sh
node test/tenants/sql_test.mjs /path/to/node_modules/@electric-sql/pglite/dist/index.js
```

The PostgreSQL fixture derives columns from checked-in model metadata, retains
required fields and adds tenant/creator foreign keys. It is not a substitute for
an end-to-end HTTP test against the production schema. Changed production sources
are separately syntax-checked against actual Drogon/model/JWT headers.
