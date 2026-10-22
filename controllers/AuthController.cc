#include "AuthController.h"
#include <unordered_set>
#include "dto/BaseApiResponse.h"
#include "dto/PasskeyLoginDto.h"
#include "plugins/BusinessDeskServicePlugin.h"
#include "constants/ErrorCodes.h"

namespace {
Task<HttpResponsePtr> authenticateRequest(HttpRequestPtr req, bool host, bool passkey) {
    if (req->getMethod() == Options) {
        auto response = HttpResponse::newHttpResponse();
        response->setStatusCode(k204NoContent);
        co_return response;
    }
    using namespace business_desk;
    dto::BaseApiResponse result;
    const auto body = req->getJsonObject();
    if (!body || !body->isObject()) {
        result.error["code"] = constants::ERR_VALIDATION;
        result.error["message"] = "Expected a JSON object.";
        auto response = HttpResponse::newHttpJsonResponse(result.toJson());
        response->setStatusCode(k400BadRequest);
        response->addHeader("Cache-Control", "no-store");
        co_return response;
    }
    // Reject malformed input rather than allowing JsonCpp conversions to throw.
    for (const auto *field : {"accountId", "usernameOrEmail", "password"}) {
        if (body->isMember(field) && !(*body)[field].isString()) {
            result.error["code"] = constants::ERR_VALIDATION;
            result.error["message"] = "Login fields must be strings.";
            auto response = HttpResponse::newHttpJsonResponse(result.toJson());
            response->setStatusCode(k400BadRequest);
            response->addHeader("Cache-Control", "no-store");
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
            response->setStatusCode(k503ServiceUnavailable);
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

Task<HttpResponsePtr> AuthController::tenantVerifyTotp(HttpRequestPtr req) {
    if (req->getMethod() == Options) {
        auto response = HttpResponse::newHttpResponse();
        response->setStatusCode(k204NoContent);
        co_return response;
    }
    const auto body = req->getJsonObject();
    if (!body || !body->isObject() || !(*body)["challengeId"].isString() || !(*body)["code"].isString()) {
        auto response = HttpResponse::newHttpResponse();
        response->setStatusCode(k400BadRequest);
        response->addHeader("Cache-Control", "no-store");
        co_return response;
    }
    auto &service = app().getPlugin<business_desk::plugins::BusinessDeskServicePlugin>()->getUserService();
    auto result = co_await service.verifyTenantSecondFactor((*body)["challengeId"].asString(), (*body)["code"].asString());
    auto response = HttpResponse::newHttpJsonResponse(result.toJson());
    response->addHeader("Cache-Control", "no-store");
    if (!result.success) response->setStatusCode(result.error["code"].asInt() == business_desk::constants::ERR_INTERNAL
        ? k503ServiceUnavailable : k401Unauthorized);
    co_return response;
}

Task<HttpResponsePtr> AuthController::tenantIdentity(HttpRequestPtr req) {
    auto response = HttpResponse::newHttpResponse();
    if (req->getMethod() == Options) { response->setStatusCode(k204NoContent); co_return response; }
    business_desk::dto::BaseApiResponse result;
    result.success = true;
    for (const auto *field : {"tenantId", "tenantName", "accountId"})
        result.result[field] = req->attributes()->get<std::string>(field);
    result.result["userId"] = req->attributes()->get<std::string>("tenantUserId");
    result.result["username"] = req->attributes()->get<std::string>("tenantUserName");
    result.result["email"] = req->attributes()->get<std::string>("tenantUserEmail");
    result.result["permissions"] = Json::arrayValue;
    for (const auto &permission : req->attributes()->get<std::unordered_set<std::string>>("permissions"))
        result.result["permissions"].append(permission);
    response = HttpResponse::newHttpJsonResponse(result.toJson());
    response->addHeader("Cache-Control", "no-store");
    co_return response;
}
