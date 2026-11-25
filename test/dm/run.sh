#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${JSONCPP_SOURCE_DIR:=/tmp/jsoncpp}"
if [ ! -f "$JSONCPP_SOURCE_DIR/dist/jsoncpp.cpp" ]; then
  if [ ! -d "/tmp/jsoncpp" ]; then
    git clone --depth 1 https://github.com/open-source-parsers/jsoncpp /tmp/jsoncpp
  fi
  (cd /tmp/jsoncpp && python3 amalgamate.py)
  JSONCPP_SOURCE_DIR=/tmp/jsoncpp
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
python3 test/users/prepare_mocks.py "$work/mocks"
python3 - "$work/mocks" <<'PY'
import pathlib, sys
m = pathlib.Path(sys.argv[1])
h = m / 'drogon/drogon.h'
s = h.read_text()
s = s.replace('struct TestField {', 'struct TestField {\n bool isNull() const { return value.isNull(); }')
s = s.replace('else return value.asInt64();',
              'else if constexpr (std::is_same_v<T,double>) return value.asDouble();\n  else return value.asInt64();')
s = s.replace('const std::vector<Json::Value> params{Json::Value(args)...};',
'''auto toVal = [](const auto &v) -> Json::Value {
   using D = std::decay_t<decltype(v)>;
   if constexpr (std::is_same_v<D, long long> || std::is_same_v<D, long>) return Json::Value(static_cast<Json::Int64>(v));
   else if constexpr (std::is_same_v<D, unsigned long long> || std::is_same_v<D, unsigned long>) return Json::Value(static_cast<Json::UInt64>(v));
   else if constexpr (std::is_same_v<D, std::nullptr_t>) return Json::Value(Json::nullValue);
   else return Json::Value(v);
  };
  (void)toVal;
  const std::vector<Json::Value> params{toVal(args)...};''')
s += '''
#include <stdexcept>
namespace drogon::orm {
using Row = drogon::TestRow;
struct Result : drogon::TestResult {
  Result() = delete;
  Result(drogon::TestResult r) : drogon::TestResult(std::move(r)) {}
  Result(const Result &) = default;
  Result(Result &&) noexcept = default;
  Result &operator=(const Result &) = default;
  Result &operator=(Result &&) noexcept = default;
};
using DbClientPtr = std::shared_ptr<drogon::TestDb>;
using Transaction = drogon::TestTransaction;
struct Failure : std::runtime_error { using std::runtime_error::runtime_error; };
}
'''
h.write_text(s)
hc = m / 'drogon/HttpController.h'
hc.write_text(hc.read_text().replace('#define ADD_METHOD_TO(...)', '#define ADD_METHOD_TO(...) static_assert(true)'))
PY

g++ -std=c++20 -O0 -Wall -Wextra -Wpedantic -Werror=return-type \
  -I"$work/mocks" -I. -I"$JSONCPP_SOURCE_DIR/dist" \
  test/dm/service_test.cc \
  controllers/DmController.cc \
  domain_services/dm/DmFolders.cc \
  domain_services/dm/DmDocuments.cc \
  domain_services/dm/DmWorkflows.cc \
  domain_services/dm/DmEnterprise.cc \
  domain_services/dm/DmService.cc \
  "$JSONCPP_SOURCE_DIR/dist/jsoncpp.cpp" \
  -o "$work/dm_test"
"$work/dm_test"
node test/dm/sql_check.mjs
