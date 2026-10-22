#pragma once
#include <drogon/HttpController.h>
class EmployeeController : public drogon::HttpController<EmployeeController> {
public:
  METHOD_LIST_BEGIN
  ADD_METHOD_TO(EmployeeController::list, "/api/v1/shared/employees",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(EmployeeController::options, "/api/v1/shared/employees/options",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(EmployeeController::get, "/api/v1/shared/employees/{1}",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(EmployeeController::create, "/api/v1/shared/employees",
                drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(EmployeeController::update, "/api/v1/shared/employees/{1}",
                drogon::Put, "TenantJwtAuthFilter");
  ADD_METHOD_TO(EmployeeController::remove, "/api/v1/shared/employees/{1}",
                drogon::Delete, "TenantJwtAuthFilter");
  METHOD_LIST_END
  drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> options(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req,
                                            std::string id);
  drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req,
                                               std::string id);
  drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req,
                                               std::string id);
};
