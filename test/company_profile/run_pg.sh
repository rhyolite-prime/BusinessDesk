#!/usr/bin/env bash
# Requires a disposable PostgreSQL database and libpq. Creates/drops company_profile_test schema.
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${COMPANY_PROFILE_TEST_DATABASE_URL:?Set a disposable PostgreSQL connection string}"
: "${JSONCPP_SOURCE_DIR:?Set a JsonCpp checkout with amalgamated dist/jsoncpp.cpp}"
: "${LIBPQ_LIB_DIR:?Set directory containing libpq.so}"
: "${OPENSSL_SOURCE_DIR:?Set a built OpenSSL checkout}"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
python3 test/banks/prepare_db_seam.py "$work/mocks"
g++ -std=c++20 -O0 ${COMPANY_PROFILE_TEST_SANITIZERS:-} -I"$work/mocks" -I. -I"$JSONCPP_SOURCE_DIR/dist" -I"$OPENSSL_SOURCE_DIR/include" \
 test/company_profile/service_pg_test.cc domain_services/shared/CompanyProfileService.cc "$JSONCPP_SOURCE_DIR/dist/jsoncpp.cpp" \
 -L"$LIBPQ_LIB_DIR" -Wl,-rpath,"$LIBPQ_LIB_DIR" -lpq "$OPENSSL_SOURCE_DIR/libcrypto.a" -ldl -pthread -o "$work/company_profile_test"
"$work/company_profile_test"
