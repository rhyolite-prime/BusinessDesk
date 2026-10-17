cmake_minimum_required(VERSION 3.8)
project(BusinessDeskApi_test LANGUAGES CXX)

add_executable(${PROJECT_NAME} test_main.cc)
target_link_libraries(${PROJECT_NAME} PRIVATE Drogon::Drogon)
ParseAndAddDrogonTests(${PROJECT_NAME})

