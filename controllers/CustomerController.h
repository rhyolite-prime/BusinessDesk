#pragma once
#include <drogon/HttpController.h>
class CustomerController : public drogon::HttpController<CustomerController> {
public:
  METHOD_LIST_BEGIN
  ADD_METHOD_TO(CustomerController::list, "/api/v1/shared/customers",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(CustomerController::create, "/api/v1/shared/customers",
                drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(CustomerController::update, "/api/v1/shared/customers/{1}",
                drogon::Put, "TenantJwtAuthFilter");
  ADD_METHOD_TO(CustomerController::remove, "/api/v1/shared/customers/{1}",
                drogon::Delete, "TenantJwtAuthFilter");
  METHOD_LIST_END
  drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req,
                                               std::string id);
  drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req,
                                               std::string id);
};
