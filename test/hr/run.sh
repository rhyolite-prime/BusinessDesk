#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${JSONCPP_SOURCE_DIR:?Set to an amalgamated JsonCpp checkout}"
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
python3 test/users/prepare_mocks.py "$work/mocks"
g++ -std=c++20 -I"$work/mocks" -I. -I"$JSONCPP_SOURCE_DIR/dist" test/hr/service_test.cc domain_services/hr/HrService.cc "$JSONCPP_SOURCE_DIR/dist/jsoncpp.cpp" -o "$work/test"
"$work/test"
g++ -std=c++20 -I"$work/mocks" -I. -I"$JSONCPP_SOURCE_DIR/dist" test/hr/workflow_test.cc domain_services/hr/HrWorkflowService.cc "$JSONCPP_SOURCE_DIR/dist/jsoncpp.cpp" -o "$work/workflow-test"
"$work/workflow-test"
g++ -std=c++20 -I"$work/mocks" -I. -I"$JSONCPP_SOURCE_DIR/dist" test/hr/profile_test.cc domain_services/hr/HrProfileService.cc "$JSONCPP_SOURCE_DIR/dist/jsoncpp.cpp" -o "$work/profile-test"
"$work/profile-test"
