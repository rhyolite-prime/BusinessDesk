//
// Created by Emmanuel Addo-Odame on 17/10/2026.
//


#include "PermissionService.h"
#include "Users.h"
#include "Roles.h"
#include "UserGroups.h"
#include <drogon/orm/CoroMapper.h>

namespace business_desk::domain_services {


    drogon::Task<std::unordered_set<std::string>> PermissionService::getUserPermissions(const std::string& userId) {
    std::unordered_set<std::string> allPermissions;
    auto dbClient = drogon::app().getDbClient();

    try {
        drogon::orm::CoroMapper<drogon_model::BusinessDesk::Users> userMapper(dbClient);
        using Users = drogon_model::BusinessDesk::Users;
        using UserGroups = drogon_model::BusinessDesk::UserGroups;
        auto user = co_await userMapper.findOne(
            drogon::orm::Criteria(Users::Cols::_id, drogon::orm::CompareOperator::EQ, userId) &&
            drogon::orm::Criteria(Users::Cols::_is_active, drogon::orm::CompareOperator::EQ, true) &&
            drogon::orm::Criteria(Users::Cols::_is_deleted, drogon::orm::CompareOperator::EQ, false));

        std::unordered_set<std::string> uniqueRoleIds;
        Json::Reader reader;

        // Extract direct roles
        Json::Value userRolesJson;
        std::string userRolesStr = user.getValueOfRoles();
        if (!userRolesStr.empty() && reader.parse(userRolesStr, userRolesJson) && userRolesJson.isArray()) {
            for (const auto& roleId : userRolesJson) {
                if (roleId.isString()) {
                    uniqueRoleIds.insert(roleId.asString());
                }
            }
        }

        // Extract roles from user groups
        Json::Value userGroupsJson;
        std::string userGroupsStr = user.getValueOfUserGroups();
        if (!userGroupsStr.empty() && reader.parse(userGroupsStr, userGroupsJson) && userGroupsJson.isArray()) {
            drogon::orm::CoroMapper<drogon_model::BusinessDesk::UserGroups> userGroupMapper(dbClient);
            for (const auto& groupId : userGroupsJson) {
                if (groupId.isString()) {
                    try {
                        auto group = co_await userGroupMapper.findOne(
                            drogon::orm::Criteria(UserGroups::Cols::_id, drogon::orm::CompareOperator::EQ, groupId.asString()) &&
                            drogon::orm::Criteria(UserGroups::Cols::_is_deleted, drogon::orm::CompareOperator::EQ, false));
                        Json::Value groupRolesJson;
                        std::string groupRolesStr = group.getValueOfRoles();
                        if (!groupRolesStr.empty() && reader.parse(groupRolesStr, groupRolesJson) && groupRolesJson.isArray()) {
                            for (const auto& roleId : groupRolesJson) {
                                if (roleId.isString()) uniqueRoleIds.insert(roleId.asString());
                                else if (roleId.isObject() && roleId["id"].isString())
                                    uniqueRoleIds.insert(roleId["id"].asString());
                            }
                        }
                    } catch (const drogon::orm::DrogonDbException &) {
                        // ignore missing user groups
                    }
                }
            }
        }

        // Extract permissions from roles
        if (!uniqueRoleIds.empty()) {
            drogon::orm::CoroMapper<drogon_model::BusinessDesk::Roles> roleMapper(dbClient);
            for (const auto& roleId : uniqueRoleIds) {
                try {
                    auto role = co_await roleMapper.findByPrimaryKey(roleId);
                    if (role.getValueOfTenantId() != user.getValueOfTenantId()) continue;
                    Json::Value rolePermissionsJson;
                    std::string rolePermissionsStr = role.getValueOfPermissions();
                    if (!rolePermissionsStr.empty() && reader.parse(rolePermissionsStr, rolePermissionsJson) && rolePermissionsJson.isArray()) {
                        for (const auto& perm : rolePermissionsJson) {
                            if (perm.isString()) {
                                allPermissions.insert(perm.asString());
                            }
                        }
                    }
                } catch (const drogon::orm::DrogonDbException &) {
                    // ignore missing roles
                }
            }
        }
    } catch (const drogon::orm::DrogonDbException &e) {
        LOG_ERROR << "Failed to get user permissions: " << e.base().what();
    }

    co_return allPermissions;
}

    bool PermissionService::hasPermission(const drogon::HttpRequestPtr &req, const std::string &requiredPermission) {
        if (req->attributes()->find("permissions")) {
            auto permissions = req->attributes()->get<std::unordered_set<std::string>>("permissions");
            return permissions.find(requiredPermission) != permissions.end();
        }
        return false;
    }

    Json::Value PermissionService::getAllPermissionGroups() {
        auto &app = drogon::app();
        auto customConfig = app.getCustomConfig();
        if (customConfig.isMember("PermissionGroups")) {
            return customConfig["PermissionGroups"];
        }
        return Json::arrayValue;
    }

}