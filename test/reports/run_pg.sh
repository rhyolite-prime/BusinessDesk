#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${REPORT_TEST_DATABASE_URL:?Use a disposable PostgreSQL database}"
: "${JSONCPP_SOURCE_DIR:?JsonCpp checkout with dist/jsoncpp.cpp}"
: "${LIBPQ_LIB_DIR:?Directory containing libpq.so}"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
python3 test/banks/prepare_db_seam.py "$work/mocks"
g++ -std=c++20 -O0 -I"$work/mocks" -I. -I"$JSONCPP_SOURCE_DIR/dist" test/reports/service_pg_test.cc domain_services/reports/FinancialReportService.cc "$JSONCPP_SOURCE_DIR/dist/jsoncpp.cpp" -L"$LIBPQ_LIB_DIR" -Wl,-rpath,"$LIBPQ_LIB_DIR" -lpq -pthread -o "$work/report_test"
"$work/report_test"
