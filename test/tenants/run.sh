#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${JSONCPP_SOURCE_DIR:?Set JSONCPP_SOURCE_DIR to an amalgamated JsonCpp checkout}"
: "${OPENSSL_SOURCE_DIR:?Set OPENSSL_SOURCE_DIR to a configured/built OpenSSL checkout}"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
python3 test/users/prepare_mocks.py "$work/mocks"
g++ -std=c++20 -O0 -I"$work/mocks" -I. \
    -I"$JSONCPP_SOURCE_DIR/dist" -I"$OPENSSL_SOURCE_DIR/include" \
    -Iexternal_deps/Bcrypt.cpp/include \
    test/tenants/tenant_service_test.cc domain_services/tenants/TenantService.cc \
    controllers/TenantController.cc domain_services/permissions/PermissionService.cc \
    "$JSONCPP_SOURCE_DIR/dist/jsoncpp.cpp" external_deps/Bcrypt.cpp/src/{bcrypt,blowfish}.cpp \
    "$OPENSSL_SOURCE_DIR/libcrypto.a" -ldl -pthread -o "$work/tenant_test"
"$work/tenant_test"
