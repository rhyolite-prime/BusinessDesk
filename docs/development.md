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

1. Install CMake 3.12+, a C++20 compiler, PostgreSQL 15+, and Drogon development packages, including the `drogon_ctl` CLI.
2. Create a local database and app role, apply `database/migrations/001_create_ledger_schema.sql`, and use the rollback script only against a disposable development database.
3. Copy `config.local.example.json` to the ignored `config.local.json`; replace the sample database credentials. `main.cc` loads a path from its first argument, then `BUSINESSDESK_CONFIG`, then `config.local.json`.
4. Configure `models/model.json` with the local database connection and run `drogon_ctl create model models` after the schema has been applied. Keep Drogon's generated CRUD controllers disabled; GL routes belong in the single `LedgerController`.
5. Build and test:

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build
ctest --test-dir build --output-on-failure
```

The single `LedgerController` currently exposes journal validation plus CRUD routes for account heads, control headers, and detail/posting accounts. `LedgerService` contains their coroutine-based Drogon ORM workflows, hierarchy/range/dependency rules, and transaction-bound soft deletes. Reads and writes are scoped to a tenant and accounting unit. The current request boundary reads `X-Tenant-Id` and `X-Accounting-Unit-Id` as a provisional development contract; these values are caller-controlled and **must be replaced with IDs derived from verified authentication claims before deployment**. Posting, approvals, reporting, and production authentication/authorization remain planned work.

In environments that have only a C++17 compiler, the framework-independent validation tests can be run without Drogon:

```sh
g++ -std=c++17 -Wall -Wextra -Wpedantic -Werror -I. \
  services/ledger/ledger_service_rules.cc test/ledger_service_unit_test.cc \
  -o /tmp/businessdesk-ledger-service-test
/tmp/businessdesk-ledger-service-test
```

See [ledger account setup API](ledger-account-setup-api.md) for routes, payloads, transaction behavior, and current scope limitations. The complete Drogon build and PostgreSQL-backed API behavior still need verification in an environment with Drogon, CMake, and PostgreSQL available.

Never put real credentials in `config.local.example.json`, source control, or the Nuxt public runtime config.
