#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${LOGIN_TEST_DATABASE_URL:?Disposable PostgreSQL URL required}"
: "${JSONCPP_SOURCE_DIR:?Amalgamated JsonCpp checkout}"
: "${OPENSSL_SOURCE_DIR:?Built OpenSSL checkout}"
: "${LIBPQ_LIB_DIR:?libpq library directory}"
work=$(mktemp -d);trap 'rm -rf "$work"' EXIT
python3 test/banks/prepare_db_seam.py "$work/mocks"
g++ -std=c++20 -O0 -I"$work/mocks" -I. -I"$JSONCPP_SOURCE_DIR/dist" -I"$OPENSSL_SOURCE_DIR/include" -Iexternal_deps/jwt-cpp/include -Iexternal_deps/Bcrypt.cpp/include \
 test/auth/tenant_login_pg_test.cc domain_services/users/UserService.cc domain_services/permissions/PermissionService.cc domain_services/auth/TotpService.cc "$JSONCPP_SOURCE_DIR/dist/jsoncpp.cpp" external_deps/Bcrypt.cpp/src/{bcrypt,blowfish}.cpp "$OPENSSL_SOURCE_DIR/libcrypto.a" -L"$LIBPQ_LIB_DIR" -Wl,-rpath,"$LIBPQ_LIB_DIR" -lpq -ldl -pthread -o "$work/test"
"$work/test"
