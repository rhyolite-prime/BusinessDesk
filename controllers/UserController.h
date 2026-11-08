#pragma once

#include <drogon/HttpController.h>

class UserController : public drogon::HttpController<UserController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(UserController::listTenantUsers, "/api/v1/users", drogon::Get, drogon::Options, "TenantJwtAuthFilter");
    ADD_METHOD_TO(UserController::createTenantUser, "/api/v1/users", drogon::Post, drogon::Options, "TenantJwtAuthFilter");
    ADD_METHOD_TO(UserController::updateTenantUser, "/api/v1/users/{1}", drogon::Put, drogon::Options, "TenantJwtAuthFilter");
    ADD_METHOD_TO(UserController::deleteTenantUser, "/api/v1/users/{1}", drogon::Delete, drogon::Options, "TenantJwtAuthFilter");
    ADD_METHOD_TO(UserController::listHostUsers, "/api/v1/host/users", drogon::Get, drogon::Options, "HostJwtAuthFilter");
    ADD_METHOD_TO(UserController::createHostUser, "/api/v1/host/users", drogon::Post, drogon::Options, "HostJwtAuthFilter");
    ADD_METHOD_TO(UserController::updateHostUser, "/api/v1/host/users/{1}", drogon::Put, drogon::Options, "HostJwtAuthFilter");
    ADD_METHOD_TO(UserController::deleteHostUser, "/api/v1/host/users/{1}", drogon::Delete, drogon::Options, "HostJwtAuthFilter");
    METHOD_LIST_END

    drogon::Task<drogon::HttpResponsePtr> listTenantUsers(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> createTenantUser(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> updateTenantUser(drogon::HttpRequestPtr request, std::string id);
    drogon::Task<drogon::HttpResponsePtr> deleteTenantUser(drogon::HttpRequestPtr request, std::string id);
    drogon::Task<drogon::HttpResponsePtr> listHostUsers(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> createHostUser(drogon::HttpRequestPtr request);
    drogon::Task<drogon::HttpResponsePtr> updateHostUser(drogon::HttpRequestPtr request, std::string id);
    drogon::Task<drogon::HttpResponsePtr> deleteHostUser(drogon::HttpRequestPtr request, std::string id);
};
