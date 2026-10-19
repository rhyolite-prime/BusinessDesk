#pragma once

#include <drogon/HttpAppFramework.h>
#include <drogon/HttpFilter.h>
#include <drogon/utils/coroutine.h>
#include <jwt-cpp/jwt.h>
#include "domain_services/permissions/PermissionService.h"
#include "dto/BaseApiResponse.h"
#include <stdexcept>
#include <utility>

namespace business_desk::auth {
inline void deny(const drogon::FilterCallback &callback, drogon::HttpStatusCode status, const char *message) {
    dto::BaseApiResponse body;
    body.error["code"] = status == drogon::k401Unauthorized ? "unauthorized" : "authorization_unavailable";
    body.error["message"] = message;
    auto response = drogon::HttpResponse::newHttpJsonResponse(body.toJson());
    response->setStatusCode(status);
    response->addHeader("Cache-Control", "no-store");
    callback(response);
}

inline std::string claim(const jwt::decoded_jwt<jwt::traits::kazuho_picojson> &token, const char *name) {
    if (!token.has_payload_claim(name)) throw std::runtime_error("Missing identity claim");
    auto value = token.get_payload_claim(name).as_string();
    if (value.empty()) throw std::runtime_error("Empty identity claim");
    return value;
}

inline void filter(const drogon::HttpRequestPtr &request, drogon::FilterCallback callback,
                   drogon::FilterChainCallback next, bool host) {
    if (request->getMethod() == drogon::Options) { next(); return; }
    // Only a freshly resolved identity may authorize this request. In particular,
    // legacy JWT permissions and attributes left by another filter are untrusted.
    for (const char *key : {"accountId", "tenantUserName", "permissions", "hostUserId", "hostUserEmail", "hostUserName",
                           "tenantId", "tenantName", "tenantEmail", "tenantUserId", "tenantUserEmail"})
        request->attributes()->erase(key);

    std::string key, issuer, audience;
    try {
        const auto config = drogon::app().getCustomConfig()["JwtBearer"];
        if (!config.isObject() || !config["JwtSecurityKey"].isString() ||
            !config["JwtIssuer"].isString() ||
            (!config["JwtAudience"].isNull() && !config["JwtAudience"].isString()))
            throw std::runtime_error("Invalid authentication configuration");
        key = config["JwtSecurityKey"].asString();
        issuer = config["JwtIssuer"].asString();
        audience = config["JwtAudience"].asString();
        if (key.empty() || issuer.empty()) throw std::runtime_error("Missing authentication configuration");
    } catch (const std::exception &) {
        deny(callback, drogon::k503ServiceUnavailable, "Authentication service unavailable");
        return;
    }
    std::string userId, tenantId;
    bool secondFactorVerified = false;
    try {
        auto header = request->getHeader("Authorization");
        if (header.empty()) header = request->getHeader("authorization");
        if (header.compare(0, 7, "Bearer ") != 0 || header.size() == 7)
            throw std::runtime_error("Missing bearer token");
        auto verifier = jwt::verify().allow_algorithm(jwt::algorithm::hs256{key}).with_issuer(issuer);
        if (!audience.empty()) verifier.with_audience(audience);
        const auto decoded = jwt::decode(header.substr(7));
        verifier.verify(decoded);
        if (!decoded.has_payload_claim("exp")) throw std::runtime_error("Missing expiration");
        if (host) {
            if (decoded.has_payload_claim("tenantId") || decoded.has_payload_claim("tenantUserId"))
                throw std::runtime_error("Wrong token scope");
            userId = claim(decoded, "hostUserId");
        } else {
            if (decoded.has_payload_claim("hostUserId")) throw std::runtime_error("Wrong token scope");
            tenantId = claim(decoded, "tenantId");
            userId = claim(decoded, "tenantUserId");
            if (decoded.has_payload_claim("mfa")) secondFactorVerified = decoded.get_payload_claim("mfa").as_boolean();
        }
        if (decoded.has_payload_claim("sub") && decoded.get_subject() != userId)
            throw std::runtime_error("Subject mismatch");
        // Deliberately never read the permissions claim, even in older tokens.
    } catch (const std::exception &) {
        deny(callback, drogon::k401Unauthorized, "Invalid or expired authentication token");
        return;
    }

    // The callback-based Drogon filter API must not block its event loop on ORM
    // work. async_run owns the captures until the coroutine has finished.
    drogon::async_run([request, userId = std::move(userId), tenantId = std::move(tenantId), host, secondFactorVerified,
                       callback = std::move(callback), next = std::move(next)]() -> drogon::Task<void> {
        domain_services::RequestAuthorization authorization;
        try {
            authorization = co_await domain_services::PermissionService::resolveRequestAuthorization(userId, tenantId, host, secondFactorVerified);
        } catch (const std::exception &) {
            // No cached/partial permissions or bypass when the DB is unavailable.
            deny(callback, drogon::k503ServiceUnavailable, "Authorization service unavailable");
            co_return;
        }
        if (!authorization.authenticated) {
            deny(callback, drogon::k401Unauthorized, "User or tenant is no longer authorized");
            co_return;
        }
        if (host) {
            request->attributes()->insert("hostUserId", authorization.userId);
            request->attributes()->insert("hostUserEmail", authorization.userEmail);
            request->attributes()->insert("hostUserName", authorization.username);
        } else {
            request->attributes()->insert("accountId", authorization.accountId);
            request->attributes()->insert("tenantUserName", authorization.username);
            request->attributes()->insert("tenantId", authorization.tenantId);
            request->attributes()->insert("tenantName", authorization.tenantName);
            request->attributes()->insert("tenantUserId", authorization.userId);
            request->attributes()->insert("tenantUserEmail", authorization.userEmail);
        }
        request->attributes()->insert("permissions", std::move(authorization.permissions));
        // Do not catch downstream handler exceptions here or invoke two callbacks.
        next();
    });
}
}
