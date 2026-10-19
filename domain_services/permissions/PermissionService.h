#pragma once
#include <drogon/drogon.h>
#include <drogon/utils/coroutine.h>
#include <unordered_set>
#include <string>
#include <json/json.h>

namespace business_desk::domain_services {
struct RequestAuthorization {
    bool authenticated = false;
    std::string userId, tenantId, userEmail, username, tenantName, accountId;
    std::unordered_set<std::string> permissions;
};

class PermissionService {
public:
    // Current database state is authoritative. No cache and no JWT permission claims.
    // Invalid identity/state returns authenticated=false; database/data errors propagate.
    static drogon::Task<RequestAuthorization> resolveRequestAuthorization(
        std::string userId, std::string tenantId, bool host, bool secondFactorVerified = false);

    // Used by sign-in to return a current permission snapshot to the client (not JWT).
    // Missing/disabled users return {}; infrastructure/data failures propagate.
    static drogon::Task<std::unordered_set<std::string>> getUserPermissions(const std::string &userId);

    // Synchronous check of permissions already resolved by an authentication filter.
    static bool hasPermission(const drogon::HttpRequestPtr &req, const std::string &requiredPermission);
    static Json::Value getAllPermissionGroups();
};
}
