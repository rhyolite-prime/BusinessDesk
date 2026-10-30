#pragma once
#include <drogon/HttpController.h>

class TenantController : public drogon::HttpController<TenantController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(TenantController::list, "/api/v1/tenants", drogon::Get, drogon::Options, "HostJwtAuthFilter");
    ADD_METHOD_TO(TenantController::create, "/api/v1/tenants", drogon::Post, drogon::Options, "HostJwtAuthFilter");
    ADD_METHOD_TO(TenantController::get, "/api/v1/tenants/{1}", drogon::Get, drogon::Options, "HostJwtAuthFilter");
    ADD_METHOD_TO(TenantController::update, "/api/v1/tenants/{1}", drogon::Put, drogon::Options, "HostJwtAuthFilter");
    ADD_METHOD_TO(TenantController::remove, "/api/v1/tenants/{1}", drogon::Delete, drogon::Options, "HostJwtAuthFilter");
    ADD_METHOD_TO(TenantController::activate, "/api/v1/tenants/{1}/activate", drogon::Post, drogon::Options, "HostJwtAuthFilter");
    ADD_METHOD_TO(TenantController::deactivate, "/api/v1/tenants/{1}/deactivate", drogon::Post, drogon::Options, "HostJwtAuthFilter");
    METHOD_LIST_END
    drogon::Task<drogon::HttpResponsePtr> list(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> create(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> get(drogon::HttpRequestPtr request, std::string id);
    drogon::Task<drogon::HttpResponsePtr> update(drogon::HttpRequestPtr request, std::string id);
    drogon::Task<drogon::HttpResponsePtr> remove(drogon::HttpRequestPtr request, std::string id);
    drogon::Task<drogon::HttpResponsePtr> activate(drogon::HttpRequestPtr request, std::string id);
    drogon::Task<drogon::HttpResponsePtr> deactivate(drogon::HttpRequestPtr request, std::string id);
};
