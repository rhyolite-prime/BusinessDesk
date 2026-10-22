#pragma once

#include <drogon/HttpController.h>

using namespace drogon;

class AuthController : public drogon::HttpController<AuthController>
{
  public:
    static constexpr const char *PREFIX = "/api/v1/auth/";
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AuthController::tenantLoginViaPasskeys, std::string(PREFIX) + "tenant-login-via-pass-keys", Post, Options);
    ADD_METHOD_TO(AuthController::hostLoginViaPasskeys, std::string(PREFIX) + "host-login-via-pass-keys", Post, Options);
    ADD_METHOD_TO(AuthController::hostSignIn, std::string(PREFIX) + "host-login", Post, Options);
    ADD_METHOD_TO(AuthController::tenantSignIn, std::string(PREFIX) + "tenant-login", Post, Options);
    ADD_METHOD_TO(AuthController::tenantVerifyTotp, std::string(PREFIX) + "tenant-verify-totp", Post, Options);
    ADD_METHOD_TO(AuthController::tenantIdentity, std::string(PREFIX) + "me", Get, Options, "TenantJwtAuthFilter");
    METHOD_LIST_END


  Task<HttpResponsePtr> tenantLoginViaPasskeys(HttpRequestPtr req);
  Task<HttpResponsePtr> hostLoginViaPasskeys(HttpRequestPtr req);
  Task<HttpResponsePtr> hostSignIn(HttpRequestPtr req);
  Task<HttpResponsePtr> tenantIdentity(HttpRequestPtr req);
  Task<HttpResponsePtr> tenantVerifyTotp(HttpRequestPtr req);
  Task<HttpResponsePtr> tenantSignIn(HttpRequestPtr req);

};
