cmake_minimum_required(VERSION 3.8)
project(BusinessDeskApi_test LANGUAGES CXX)

add_executable(${PROJECT_NAME} test_main.cc)
target_link_libraries(${PROJECT_NAME} PRIVATE Drogon::Drogon)
ParseAndAddDrogonTests(${PROJECT_NAME})

# Pure GL business-rule tests do not need a database or the Drogon runtime.
add_executable(BusinessDeskLedgerServiceTest
               ledger_service_unit_test.cc
               ../services/ledger/ledger_service.cc)
target_include_directories(BusinessDeskLedgerServiceTest
                           PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/..)
target_compile_features(BusinessDeskLedgerServiceTest PRIVATE cxx_std_17)
add_test(NAME BusinessDeskLedgerServiceTest COMMAND BusinessDeskLedgerServiceTest)
