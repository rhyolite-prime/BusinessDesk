#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${PREFERENCES_TEST_DATABASE_URL:?Use a disposable PostgreSQL database}"
: "${JSONCPP_SOURCE_DIR:?Set JsonCpp source with dist/jsoncpp.cpp}"
: "${LIBPQ_LIB_DIR:?Set libpq directory}"
node test/preferences/setup_pg.mjs
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
python3 test/banks/prepare_db_seam.py "$work/mocks"
g++ -std=c++20 -O0 ${PREFERENCES_TEST_SANITIZERS:-} -I"$work/mocks" -I. -I"$JSONCPP_SOURCE_DIR/dist" -Iexternal_deps/Bcrypt.cpp/include \
 test/preferences/service_pg_test.cc domain_services/preferences/PreferencesService.cc domain_services/gl/JournalService.cc "$JSONCPP_SOURCE_DIR/dist/jsoncpp.cpp" \
 external_deps/Bcrypt.cpp/src/bcrypt.cpp external_deps/Bcrypt.cpp/src/blowfish.cpp \
 -L"$LIBPQ_LIB_DIR" -Wl,-rpath,"$LIBPQ_LIB_DIR" -lpq -pthread -o "$work/test"
"$work/test"
