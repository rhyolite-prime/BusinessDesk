#pragma once
#include <drogon/HttpController.h>
class CustomerController : public drogon::HttpController<CustomerController> {
public:
  METHOD_LIST_BEGIN
  ADD_METHOD_TO(CustomerController::get, "/api/v1/shared/customers/{1}",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(CustomerController::options, "/api/v1/shared/customers/options",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(CustomerController::list, "/api/v1/shared/customers",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(CustomerController::create, "/api/v1/shared/customers",
                drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(CustomerController::update, "/api/v1/shared/customers/{1}",
                drogon::Put, "TenantJwtAuthFilter");
  ADD_METHOD_TO(CustomerController::remove, "/api/v1/shared/customers/{1}",
                drogon::Delete, "TenantJwtAuthFilter");
  ADD_METHOD_TO(CustomerController::groupList, "/api/v1/shared/customer-groups",
                drogon::Get, "TenantJwtAuthFilter");
  ADD_METHOD_TO(CustomerController::groupGet,
                "/api/v1/shared/customer-groups/{1}", drogon::Get,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(CustomerController::groupCreate,
                "/api/v1/shared/customer-groups", drogon::Post,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(CustomerController::groupUpdate,
                "/api/v1/shared/customer-groups/{1}", drogon::Put,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(CustomerController::groupRemove,
                "/api/v1/shared/customer-groups/{1}", drogon::Delete,
                "TenantJwtAuthFilter");
  METHOD_LIST_END
  drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr req,
                                               std::string id);
  drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr req,
                                               std::string id);
  drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req,
                                            std::string id);
  drogon::Task<drogon::HttpResponsePtr> options(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> groupList(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> groupGet(drogon::HttpRequestPtr req,
                                                 std::string id);
  drogon::Task<drogon::HttpResponsePtr> groupCreate(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> groupUpdate(drogon::HttpRequestPtr req,
                                                    std::string id);
  drogon::Task<drogon::HttpResponsePtr> groupRemove(drogon::HttpRequestPtr req,
                                                    std::string id);
};
