# BusinessDesk development notes

## Frontend

Node.js 22+ and the pnpm lockfile are used by the frontend. From `frontend/`:

```sh
npx --yes pnpm@10 install --frozen-lockfile
export NUXT_AUTH_API_BASE_URL=http://localhost:5004
# Set this only when ledger endpoints use a different backend origin:
# export NUXT_LEDGER_API_BASE_URL=http://localhost:5004
npm run typecheck
npm run build
npm run dev
```

Sign in with a real tenant. Tokens stay in HttpOnly cookies; browser requests
remain same-origin under `/api`, with upstream origins configured server-side.
Local development defaults the auth origin to `http://localhost:5004`; production
requires explicit configuration. `NUXT_LEDGER_API_BASE_URL` overrides the ledger
origin (legacy `LEDGER_API_BASE_URL` is also read at build/startup).

The **ledger dashboard is live-only**, even in development or with public demo
mode enabled. Its indicators, journal counts and filter catalogs come from the
C++ API and PostgreSQL. A missing backend is an error, not a request for mock
balances. Deploy both new dashboard endpoints with the frontend. See
[Live ledger dashboard](ledger-dashboard.md) for filters, calculation policy and
reproducible PostgreSQL/browser tests. Supplier, employee and receipt voucher
header Bank GLs are restricted to active bank-linked GLs in their selected unit;
see [Voucher lookups](voucher-lookups.md). Some unrelated legacy resources still
retain demo helpers; do not assume this is a global live/demo switch.

## PostgreSQL and Drogon API

1. Install PostgreSQL 15+, a C++20 compiler and Drogon development packages,
   including the `drogon_ctl` CLI. Initialize the repository's `external_deps`
   submodules (`git submodule update --init --recursive`).
2. Create a local database and app role and apply
   `database/migrations/001_create_ledger_schema.sql`. Apply subsequent feature
   migrations in order as documented for each feature; rebuilding the app does
   not migrate an existing database. Dashboard cost-center filtering requires the
   journal organization assignment in migration 014. Budget CRUD requires
   migration 011 after its prerequisites (see [Budgets](budgets.md)). Use rollback
   scripts only against a disposable development database.
3. Check the configuration selected by `main.cc` before starting the API. The
   current loader looks for `config.json`, then `../config.json`, then
   `config.local.json`, then `../config.local.json`. Ensure it selects your local,
   non-production database; command-line arguments and `BUSINESSDESK_CONFIG`
   are not currently read. Keep local credentials out of source control and
   public runtime configuration.
4. If regenerating models, configure `models/model.json` locally and run
   `drogon_ctl create model models` after applying the schema. Review tenant-scoped
   composite foreign-key relationships using
   [Generated model relationships](generated-model-relationships.md). Keep
   generated CRUD controllers disabled; use the authenticated feature controllers.
5. Build and test:

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build
ctest --test-dir build --output-on-failure
```

The API includes persistent accounts, journals, vouchers, posting, reporting and
ledger-dashboard services. Feature documentation lists additional disposable
PostgreSQL and HTTP/browser integration commands; these are not all CTest targets.
The dashboard tests execute the actual service SQL with PostgreSQL and an ORM
transport seam, without needing a full Drogon server. Tests that initialize or
reset schemas must never target an application or production database.

### Tenant preferences and training-data initialization

Migration `015_tenant_preferences.sql` enables `/preferences` and administrator-only
initialization of reviewed tenant business tables. See [Preferences and reset
safeguards](preferences.md) before deployment or testing. Backups and a maintenance
window are required operational precautions: confirmed resets permanently remove
posted and archived test data while preserving company profile, access/security,
preferences and reset audit. Never test initialization against a production DB.

### Supplier shared configuration

Migration `016_suppliers.sql` adds tenant-owned supplier groups and supplier
masters, live-only audited CRUD, posting-account/currency lookups, voucher
reference safeguards and Preferences reset registration. See
[Supplier groups and suppliers](suppliers.md) for deployment order, decimal-string
contracts, balance protection, API routes and disposable integration tests.
