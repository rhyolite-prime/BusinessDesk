#!/usr/bin/env bash
# Requires a disposable PostgreSQL database and libpq. Creates/drops default_gl_test schema.
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${DEFAULT_GL_TEST_DATABASE_URL:?Set a disposable PostgreSQL connection string}"
: "${JSONCPP_SOURCE_DIR:?Set a JsonCpp checkout with amalgamated dist/jsoncpp.cpp}"
: "${LIBPQ_LIB_DIR:?Set directory containing libpq.so}"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
python3 test/banks/prepare_db_seam.py "$work/mocks"
g++ -std=c++20 -O0 ${DEFAULT_GL_TEST_SANITIZERS:-} -I"$work/mocks" -I. -I"$JSONCPP_SOURCE_DIR/dist" \
 test/default_gl_numbers/service_pg_test.cc domain_services/gl/DefaultGlNumberService.cc "$JSONCPP_SOURCE_DIR/dist/jsoncpp.cpp" \
 -L"$LIBPQ_LIB_DIR" -Wl,-rpath,"$LIBPQ_LIB_DIR" -lpq -pthread -o "$work/default_gl_test"
"$work/default_gl_test"
