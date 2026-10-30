#pragma once
#include <drogon/HttpController.h>
class TenantAccountController
    : public drogon::HttpController<TenantAccountController> {
public:
  METHOD_LIST_BEGIN
  ADD_METHOD_TO(TenantAccountController::hostList,
                "/api/v1/host/tenant-accounts", drogon::Get,
                "HostJwtAuthFilter");
  ADD_METHOD_TO(TenantAccountController::hostGet,
                "/api/v1/host/tenant-accounts/{1}", drogon::Get,
                "HostJwtAuthFilter");
  ADD_METHOD_TO(TenantAccountController::hostUpdate,
                "/api/v1/host/tenant-accounts/{1}", drogon::Put,
                "HostJwtAuthFilter");
  ADD_METHOD_TO(TenantAccountController::resolve,
                "/api/v1/host/tenant-accounts/{1}/requests/resolve",
                drogon::Post, "HostJwtAuthFilter");
  ADD_METHOD_TO(TenantAccountController::get, "/api/v1/account", drogon::Get,
                "TenantJwtAuthFilter");
  ADD_METHOD_TO(TenantAccountController::request, "/api/v1/account/requests",
                drogon::Post, "TenantJwtAuthFilter");
  ADD_METHOD_TO(TenantAccountController::entitlements,
                "/api/v1/account/entitlements", drogon::Get,
                "TenantJwtAuthFilter");
  METHOD_LIST_END
  drogon::Task<drogon::HttpResponsePtr> hostList(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> hostGet(drogon::HttpRequestPtr req,
                                                std::string id);
  drogon::Task<drogon::HttpResponsePtr> hostUpdate(drogon::HttpRequestPtr req,
                                                   std::string id);
  drogon::Task<drogon::HttpResponsePtr> resolve(drogon::HttpRequestPtr req,
                                                std::string id);
  drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr> request(drogon::HttpRequestPtr req);
  drogon::Task<drogon::HttpResponsePtr>
  entitlements(drogon::HttpRequestPtr req);
};
