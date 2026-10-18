#include "PermissionService.h"
#include "Users.h"
#include "Roles.h"
#include "UserGroups.h"
#include "Tenants.h"
#include "constants/TenantConstants.h"
#include <drogon/orm/CoroMapper.h>
#include <stdexcept>

namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
using drogon_model::BusinessDesk::Users;
using drogon_model::BusinessDesk::UserGroups;
using drogon_model::BusinessDesk::Roles;
using drogon_model::BusinessDesk::Tenants;

Criteria liveUser(const std::string &userId) {
    return Criteria(Users::Cols::_id, CompareOperator::EQ, userId) &&
        Criteria(Users::Cols::_is_deleted, CompareOperator::EQ, false) &&
        Criteria(Users::Cols::_is_active, CompareOperator::EQ, true) &&
        Criteria(Users::Cols::_is_locked_out, CompareOperator::EQ, false);
}

Json::Value array(const std::string &value) {
    if (value.empty()) return Json::Value(Json::arrayValue);
    Json::Value parsed;
    Json::Reader reader;
    if (!reader.parse(value, parsed) || !parsed.isArray())
        throw std::runtime_error("Invalid authorization data");
    return parsed;
}

std::string referenceId(const Json::Value &reference) {
    std::string id;
    if (reference.isString()) id = reference.asString();
    else if (reference.isObject() && reference["id"].isString()) id = reference["id"].asString();
    if (id.empty()) throw std::runtime_error("Invalid authorization reference");
    return id;
}

drogon::Task<std::unordered_set<std::string>> permissionsFor(const Users &user) {
    auto db = drogon::app().getDbClient();
    std::unordered_set<std::string> roleIds;
    for (const auto &reference : array(user.getValueOfRoles())) roleIds.insert(referenceId(reference));

    // UserGroups currently has no tenant_id. Membership is read from the current
    // user, and every referenced role is still constrained to that user's tenant.
    CoroMapper<UserGroups> groups(db);
    for (const auto &reference : array(user.getValueOfUserGroups())) {
        try {
            auto group = co_await groups.findOne(
                Criteria(UserGroups::Cols::_id, CompareOperator::EQ, referenceId(reference)) &&
                Criteria(UserGroups::Cols::_is_deleted, CompareOperator::EQ, false));
            for (const auto &role : array(group.getValueOfRoles())) roleIds.insert(referenceId(role));
        } catch (const UnexpectedRows &) {
            // A removed/deleted membership grants nothing. Other DB failures must
            // propagate, never produce a partially resolved authorization result.
        }
    }

    std::unordered_set<std::string> permissions;
    CoroMapper<Roles> roles(db);
    for (const auto &id : roleIds) {
        try {
            const auto scope = user.getValueOfTenantId().empty()
                ? Criteria(Roles::Cols::_tenant_id, CompareOperator::IsNull)
                : Criteria(Roles::Cols::_tenant_id, CompareOperator::EQ, user.getValueOfTenantId());
            // Roles has no is_deleted column in the current schema.
            auto role = co_await roles.findOne(Criteria(Roles::Cols::_id, CompareOperator::EQ, id) && scope);
            for (const auto &permission : array(role.getValueOfPermissions())) {
                if (!permission.isString() || permission.asString().empty())
                    throw std::runtime_error("Invalid authorization permission");
                permissions.insert(permission.asString());
            }
        } catch (const UnexpectedRows &) {
            // Missing or cross-tenant roles grant nothing.
        }
    }
    co_return permissions;
}

drogon::Task<RequestAuthorization> authorizeUser(const Users &user) {
    RequestAuthorization result;
    const auto tenantId = user.getValueOfTenantId();
    if (!tenantId.empty()) {
        try {
            CoroMapper<Tenants> tenants(drogon::app().getDbClient());
            auto tenant = co_await tenants.findOne(
                Criteria(Tenants::Cols::_id, CompareOperator::EQ, tenantId) &&
                Criteria(Tenants::Cols::_is_active, CompareOperator::EQ, true) &&
                Criteria(Tenants::Cols::_is_deleted, CompareOperator::EQ, false));
            result.tenantName = tenant.getValueOfName().empty() ? tenant.getValueOfTenancyName() : tenant.getValueOfName();
        } catch (const UnexpectedRows &) { co_return result; }
    }
    result.permissions = co_await permissionsFor(user);
    result.userId = user.getValueOfId();
    result.tenantId = tenantId;
    result.userEmail = user.getValueOfEmail();
    result.username = user.getValueOfUsername().empty() ? user.getValueOfEmail() : user.getValueOfUsername();
    result.authenticated = true;
    co_return result;
}
}

drogon::Task<RequestAuthorization> PermissionService::resolveRequestAuthorization(
    std::string userId, std::string tenantId, bool host) {
    if (userId.empty() || (!host && (tenantId.empty() || tenantId == constants::kHostTenantId)) ||
        (host && !tenantId.empty()))
        co_return RequestAuthorization{};
    auto criteria = liveUser(userId) && Criteria(Users::Cols::_is_host_admin_user, CompareOperator::EQ, host);
    if (host) {
        criteria = criteria && (Criteria(Users::Cols::_tenant_id, CompareOperator::IsNull) ||
            Criteria(Users::Cols::_tenant_id, CompareOperator::EQ, std::string(constants::kHostTenantId)));
    } else criteria = criteria && Criteria(Users::Cols::_tenant_id, CompareOperator::EQ, tenantId);
    try {
        CoroMapper<Users> users(drogon::app().getDbClient());
        auto user = co_await users.findOne(criteria);
        co_return co_await authorizeUser(user);
    } catch (const UnexpectedRows &) { co_return RequestAuthorization{}; }
}

drogon::Task<std::unordered_set<std::string>> PermissionService::getUserPermissions(const std::string &userId) {
    try {
        CoroMapper<Users> users(drogon::app().getDbClient());
        auto user = co_await users.findOne(liveUser(userId));
        auto result = co_await authorizeUser(user);
        co_return result.permissions;
    } catch (const UnexpectedRows &) { co_return std::unordered_set<std::string>{}; }
}

bool PermissionService::hasPermission(const drogon::HttpRequestPtr &req, const std::string &requiredPermission) {
    if (!req || !req->attributes()->find("permissions")) return false;
    const auto &permissions = req->attributes()->get<std::unordered_set<std::string>>("permissions");
    return permissions.find(requiredPermission) != permissions.end();
}

Json::Value PermissionService::getAllPermissionGroups() {
    const auto config = drogon::app().getCustomConfig();
    return config.isMember("PermissionGroups") ? config["PermissionGroups"] : Json::Value(Json::arrayValue);
}
}
