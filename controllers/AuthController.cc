#include "AuthController.h"
#include "dto/BaseApiResponse.h"
#include "dto/PasskeyLoginDto.h"
#include "plugins/BusinessDeskServicePlugin.h"
#include "constants/ErrorCodes.h"

namespace {
Task<HttpResponsePtr> authenticateRequest(HttpRequestPtr req, bool host, bool passkey) {
    using namespace business_desk;
    dto::BaseApiResponse result;
    const auto body = req->getJsonObject();
    if (!body || !body->isObject()) {
        result.error["code"] = constants::ERR_VALIDATION;
        result.error["message"] = "Expected a JSON object.";
        auto response = HttpResponse::newHttpJsonResponse(result.toJson());
        response->setStatusCode(k400BadRequest);
        co_return response;
    }
    // Reject malformed input rather than allowing JsonCpp conversions to throw.
    for (const auto *field : {"accountId", "usernameOrEmail", "password"}) {
        if (body->isMember(field) && !(*body)[field].isString()) {
            result.error["code"] = constants::ERR_VALIDATION;
            result.error["message"] = "Login fields must be strings.";
            auto response = HttpResponse::newHttpJsonResponse(result.toJson());
            response->setStatusCode(k400BadRequest);
            co_return response;
        }
    }
    auto &service = app().getPlugin<plugins::BusinessDeskServicePlugin>()->getUserService();
    if (passkey) {
        // Disabled until a complete, server-challenged WebAuthn ceremony exists.
        dto::PasskeyLoginDto input;
        result = co_await service.validateUserPasskeys(input);
    } else {
        dto::SigninDto input;
        input.fromJson(*body);
        if (host) result = co_await service.validateHostUserCredentials(input);
        else result = co_await service.validateTenantUserCredentials(input);
    }
    auto response = HttpResponse::newHttpJsonResponse(result.toJson());
    response->addHeader("Cache-Control", "no-store");
    if (!result.success) {
        const auto code = result.error["code"].asInt();
        if (code == constants::ERR_UNSUPPORTED_OPERATION) response->setStatusCode(k501NotImplemented);
        else if (code == constants::ERR_DB_QUERY || code == constants::ERR_INTERNAL)
            response->setStatusCode(k500InternalServerError);
        else response->setStatusCode(k401Unauthorized);
    }
    co_return response;
}
}
Task<HttpResponsePtr> AuthController::tenantLoginViaPasskeys(HttpRequestPtr req) {
    co_return co_await authenticateRequest(req, false, true);
}
Task<HttpResponsePtr> AuthController::hostLoginViaPasskeys(HttpRequestPtr req) {
    co_return co_await authenticateRequest(req, true, true);
}
Task<HttpResponsePtr> AuthController::hostSignIn(HttpRequestPtr req) {
    co_return co_await authenticateRequest(req, true, false);
}
Task<HttpResponsePtr> AuthController::tenantSignIn(HttpRequestPtr req) {
    co_return co_await authenticateRequest(req, false, false);
}
