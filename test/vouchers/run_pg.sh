#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${SUPPLIERS_TEST_DATABASE_URL:?Disposable PostgreSQL database required}"
: "${JSONCPP_SOURCE_DIR:?JsonCpp checkout with dist/jsoncpp.cpp required}"
: "${LIBPQ_LIB_DIR:?libpq directory required}"
node test/vouchers/setup_pg.mjs
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
python3 test/banks/prepare_db_seam.py "$work/mocks"
g++ -std=c++20 -O0 ${VOUCHER_TEST_SANITIZERS:-} -I"$work/mocks" -I. -I"$JSONCPP_SOURCE_DIR/dist" test/vouchers/service_pg_test.cc domain_services/gl/SupplierVoucherService.cc domain_services/gl/JournalService.cc "$JSONCPP_SOURCE_DIR/dist/jsoncpp.cpp" -L"$LIBPQ_LIB_DIR" -Wl,-rpath,"$LIBPQ_LIB_DIR" -lpq -pthread -o "$work/test"
"$work/test"
