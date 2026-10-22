#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${ACCOUNT_TEST_DATABASE_URL:?Disposable PostgreSQL URL required}"
: "${JSONCPP_SOURCE_DIR:?Amalgamated JsonCpp checkout}"
: "${LIBPQ_LIB_DIR:?libpq directory}"
node test/accounts/setup_pg.mjs
work=$(mktemp -d);trap 'rm -rf "$work"' EXIT
python3 test/banks/prepare_db_seam.py "$work/mocks"
g++ -std=c++20 -O0 ${ACCOUNT_TEST_SANITIZERS:-} -I"$work/mocks" -I. -I"$JSONCPP_SOURCE_DIR/dist" test/accounts/service_pg_test.cc domain_services/tenants/TenantAccountService.cc "$JSONCPP_SOURCE_DIR/dist/jsoncpp.cpp" -L"$LIBPQ_LIB_DIR" -Wl,-rpath,"$LIBPQ_LIB_DIR" -lpq -pthread -o "$work/test"
"$work/test"
