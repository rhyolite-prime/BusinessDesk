#!/usr/bin/env bash
# Uses externally built OpenSSL and JsonCpp sources; nothing is downloaded here.
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${JSONCPP_SOURCE_DIR:?Set JSONCPP_SOURCE_DIR to a JsonCpp checkout with amalgamated dist/jsoncpp.cpp}"
: "${OPENSSL_SOURCE_DIR:?Set OPENSSL_SOURCE_DIR to a configured OpenSSL checkout containing libcrypto.a}"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
python3 test/users/prepare_mocks.py "$work/mocks"
g++ -std=c++20 -O0 -I"$work/mocks" -I. \
    -I"$JSONCPP_SOURCE_DIR/dist" -I"$OPENSSL_SOURCE_DIR/include" \
    -Iexternal_deps/jwt-cpp/include -Iexternal_deps/Bcrypt.cpp/include \
    test/users/user_service_test.cc test/users/request_authorization_test.cc test/users/totp_login_test.cc test/users/gl_soft_delete_test.cc test/users/user_controller_test.cc \
    controllers/UserController.cc domain_services/users/UserService.cc domain_services/auth/TotpService.cc domain_services/permissions/PermissionService.cc domain_services/gl/GlService.cc \
    filters/HostJwtAuthFilter.cc filters/TenantJwtAuthFilter.cc \
    "$JSONCPP_SOURCE_DIR/dist/jsoncpp.cpp" \
    external_deps/Bcrypt.cpp/src/{bcrypt,blowfish}.cpp \
    "$OPENSSL_SOURCE_DIR/libcrypto.a" -ldl -pthread -o "$work/users_test"
"$work/users_test"
