//
// Created by Emmanuel Addo-Odame on 17/10/2026.
//

#ifndef BUSINESSDESKAPI_PERMISSIONSERVICE_H
#define BUSINESSDESKAPI_PERMISSIONSERVICE_H
#include <drogon/drogon.h>
#include <drogon/utils/coroutine.h>
#include <unordered_set>
#include <string>
#include <json/json.h>

namespace business_desk::domain_services {

    class PermissionService {
    public:
        // Fetches the set of permissions for a given user from the database
        static drogon::Task<std::unordered_set<std::string>> getUserPermissions(const std::string& userId);

        // Checks if the current request (and its associated user) has the required permission
        static bool hasPermission(const drogon::HttpRequestPtr &req, const std::string &requiredPermission);

        // Returns all PermissionGroups from config.json
        static Json::Value getAllPermissionGroups();
    };

}
#endif //BUSINESSDESKAPI_PERMISSIONSERVICE_H
