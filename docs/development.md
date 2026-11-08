# BusinessDesk development notes

## Frontend

From `frontend/`:

```sh
npm ci
npm run typecheck
npm run build
npm run dev
```

With `LEDGER_API_BASE_URL` unset, the Nuxt server uses in-memory demo data. Those demo writes are process-local, are not durable, and are intended only for local UI work. To proxy to Drogon, set `LEDGER_API_BASE_URL` in the Nuxt server environment; browser requests remain same-origin under `/api/ledger/*`.

## PostgreSQL and Drogon API

1. Install PostgreSQL 15+ and Drogon development packages, including the `drogon_ctl` CLI.
2. Create a local database and app role and apply `database/migrations/001_create_ledger_schema.sql`. Apply subsequent feature migrations in order as documented for each feature; rebuilding the app does not migrate an existing database. Budget CRUD requires `011_budgets.sql` after its prerequisites (see `docs/budgets.md`). Use rollback scripts only against a disposable development database.
3. Copy `config.local.example.json` to the ignored `config.local.json`; replace the sample database credentials. `main.cc` loads a path from its first argument, then `BUSINESSDESK_CONFIG`, then `config.local.json`.
4. Configure `models/model.json` with the local database connection and run `drogon_ctl create model models` after the schema has been applied, then **run `python3 scripts/fix_generated_composite_relationships.py`** before building. This repairs Drogon's per-column inference for the tenant-scoped voucher/imprest composite foreign keys (see `docs/generated-model-relationships.md`). Keep Drogon's generated CRUD controllers disabled; GL routes belong in the single `LedgerController`.
5. Build and test:

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build
ctest --test-dir build --output-on-failure
```

The current GL controller only exposes journal validation. ORM-backed account and journal persistence, authentication/tenant context, posting, and reporting are still planned work. In environments that have only a C++17 compiler, the pure validation test can be run without Drogon:

```sh
g++ -std=c++17 -Wall -Wextra -Wpedantic -Werror -I. \
  services/ledger/ledger_service.cc test/ledger_service_unit_test.cc \
  -o /tmp/businessdesk-ledger-service-test
/tmp/businessdesk-ledger-service-test
```

Never put real credentials in `config.local.example.json`, source control, or the Nuxt public runtime config.

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
