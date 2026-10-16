cmake_minimum_required(VERSION 3.8)
project(BusinessDeskApi_test LANGUAGES CXX)

add_executable(${PROJECT_NAME} test_main.cc)
target_link_libraries(${PROJECT_NAME} PRIVATE Drogon::Drogon)
ParseAndAddDrogonTests(${PROJECT_NAME})

# Pure GL business-rule tests do not need PostgreSQL, Drogon, or C++20.
# Keep this target at C++17 so domain validation remains easy to test in a
# lightweight toolchain; the production API target uses C++20 for coroutines.
add_executable(BusinessDeskLedgerServiceTest
               ledger_service_unit_test.cc
               ../services/ledger/ledger_service_rules.cc)
target_include_directories(BusinessDeskLedgerServiceTest
                           PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/..)
set_target_properties(BusinessDeskLedgerServiceTest PROPERTIES
                      CXX_STANDARD 17
                      CXX_STANDARD_REQUIRED ON
                      CXX_EXTENSIONS OFF)
add_test(NAME BusinessDeskLedgerServiceTest COMMAND BusinessDeskLedgerServiceTest)
