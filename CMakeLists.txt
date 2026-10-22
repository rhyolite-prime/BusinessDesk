cmake_minimum_required(VERSION 3.12)
project(BusinessDeskApi CXX)

# Custom file extension configuration
if(NOT DEFINED DEFAULT_SOURCE_EXTENSION)
    set(DEFAULT_SOURCE_EXTENSION "cc" CACHE STRING "Default source file extension (e.g., cc, cpp, cxx)")
endif()
if(NOT DEFINED DEFAULT_HEADER_EXTENSION)
    set(DEFAULT_HEADER_EXTENSION "h" CACHE STRING "Default header file extension (e.g., h, hpp, hxx)")
endif()

# Drogon's coroutine ORM/controller APIs require C++20.
if (NOT DEFINED CMAKE_CXX_STANDARD OR "${CMAKE_CXX_STANDARD}" STREQUAL "")
    set(CMAKE_CXX_STANDARD 20)
elseif (CMAKE_CXX_STANDARD LESS 20)
    message(FATAL_ERROR "C++20 or higher is required for Drogon coroutines")
endif ()

set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(${PROJECT_NAME} main.${DEFAULT_SOURCE_EXTENSION}
        domain_services/gl/GlService.h
        domain_services/gl/GlService.cc
        domain_services/preferences/PreferencesService.cc
        domain_services/gl/AccountingPeriodService.cc
        domain_services/gl/JournalService.cc
        domain_services/gl/SupplierVoucherService.cc
        domain_services/tenants/TenantAccountService.cc
        domain_services/gl/BudgetService.cc
        domain_services/gl/BankAccountService.cc
        domain_services/gl/DefaultGlNumberService.cc
        domain_services/shared/CompanyProfileService.cc
        domain_services/shared/CostCenterService.cc
        domain_services/shared/SystemNumberService.cc
        domain_services/shared/SupplierService.cc
        domain_services/shared/BankService.cc
        domain_services/shared/CurrencyService.cc
        domain_services/gl/AccountDetailService.cc
        domain_services/gl/AccountControlService.cc
        domain_services/gl/AccountHeadService.cc
        domain_services/gl/AccountingUnitService.cc
        domain_services/hr/HrService.h
        domain_services/hr/HrService.cc
        domain_services/payroll/PayrollService.h
        domain_services/payroll/PayrollService.cc
        domain_services/sm/SchoolService.h
        domain_services/sm/SchoolService.cc
        dto/BaseGlDto.h
        dto/BaseApiResponse.h
        constants/BusinessDeskConsts.h
        constants/ErrorCodes.h
        domain_services/roles/RoleService.h
        domain_services/roles/RoleService.cc
        domain_services/users/UserService.h
        domain_services/users/UserService.cc
        domain_services/auth/TotpService.cc
        domain_services/tenants/TenantService.h
        domain_services/tenants/TenantService.cc
        dto/RoleDto.h
        dto/UserGroupDto.h
        dto/UserDto.h
        dto/PasskeyLoginDto.h
        domain_services/permissions/PermissionService.h
        domain_services/permissions/PermissionService.cc
)

# ##############################################################################
# External dependencies (git submodules under external_deps/)
# ##############################################################################

# Bcrypt.cpp — compiled static library
# Its CMakeLists.txt declares cmake_minimum_required(VERSION 3.2) which modern
# CMake rejects. Override the policy floor so it builds without modification.
set(CMAKE_POLICY_VERSION_MINIMUM 3.12)
add_subdirectory(external_deps/Bcrypt.cpp)

# jwt-cpp — header-only INTERFACE library (disable examples/tests to avoid
# pulling in nlohmann-json and other test-only deps at configure time)
set(JWT_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(JWT_BUILD_TESTS    OFF CACHE BOOL "" FORCE)
add_subdirectory(external_deps/jwt-cpp)

# ##############################################################################
# If you include the drogon source code locally in your project, use this method
# to add drogon
# add_subdirectory(drogon)
# target_link_libraries(${PROJECT_NAME} PRIVATE drogon)
#
# and comment out the following lines
find_package(Drogon CONFIG REQUIRED)
target_link_libraries(${PROJECT_NAME} PRIVATE Drogon::Drogon bcrypt jwt-cpp::jwt-cpp)

if (CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(${PROJECT_NAME} PRIVATE -Wall -Wextra -Wpedantic)
endif()

# ##############################################################################

message(STATUS "Using C++${CMAKE_CXX_STANDARD} for the application target")

aux_source_directory(controllers CTL_SRC)
aux_source_directory(filters FILTER_SRC)
aux_source_directory(plugins PLUGIN_SRC)
aux_source_directory(models MODEL_SRC)
aux_source_directory(domain_services/ledger LEDGER_SERVICE_SRC)

# Drogon-generated model files routinely have unused parameters (e.g. 'id',
# 'isForCreation') that we cannot fix without losing regeneration capability.
# Suppress the warning only for those files to keep the build log clean.
foreach(_model_src ${MODEL_SRC})
    set_source_files_properties(${_model_src} PROPERTIES
        COMPILE_OPTIONS "-Wno-unused-parameter")
endforeach()

drogon_create_views(${PROJECT_NAME} ${CMAKE_CURRENT_SOURCE_DIR}/views
                    ${CMAKE_CURRENT_BINARY_DIR})
# use the following line to create views with namespaces.
# drogon_create_views(${PROJECT_NAME} ${CMAKE_CURRENT_SOURCE_DIR}/views
#                     ${CMAKE_CURRENT_BINARY_DIR} TRUE)
# use the following line to create views with namespace CHANGE_ME prefixed
# and path namespaces.
# drogon_create_views(${PROJECT_NAME} ${CMAKE_CURRENT_SOURCE_DIR}/views
#                     ${CMAKE_CURRENT_BINARY_DIR} TRUE CHANGE_ME)

target_include_directories(${PROJECT_NAME}
                           PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}
                                   ${CMAKE_CURRENT_SOURCE_DIR}/models)
target_sources(${PROJECT_NAME}
               PRIVATE
               ${SRC_DIR}
               ${CTL_SRC}
               ${FILTER_SRC}
               ${PLUGIN_SRC}
               ${MODEL_SRC}
               ${LEDGER_SERVICE_SRC})
# ##############################################################################
# uncomment the following line for dynamically loading views
# set_property(TARGET ${PROJECT_NAME} PROPERTY ENABLE_EXPORTS ON)

# ##############################################################################

include(CTest)
if (BUILD_TESTING)
    add_subdirectory(test)
endif()
