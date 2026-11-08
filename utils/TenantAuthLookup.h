#pragma once
#include <drogon/drogon.h>
#include <drogon/orm/CoroMapper.h>
#include <optional>
#include <string>
namespace business_desk::utils::tenant_auth {
// Authentication must not SELECT the generated Tenants model's entire billing
// schema. Regenerating that model must not make login depend on new module columns.
struct Tenant {
    std::string id, accountId, name;
    bool requireTwoFactorAuth = false;
};
inline drogon::Task<std::optional<Tenant>> findActive(
    drogon::orm::DbClientPtr db, std::string value, bool byAccount = false) {
    const std::string sql = std::string("/* tenant_auth_lookup */ SELECT id,tenancy_name,name,require_two_factor_auth FROM tenants WHERE is_deleted=false AND is_active=true AND ") +
        (byAccount ? "tenancy_name=$1" : "id=$1::uuid");
    auto rows = co_await db->execSqlCoro(sql, value);
    if (rows.size() != 1) co_return std::nullopt;
    Tenant tenant;
    tenant.id = rows[0]["id"].as<std::string>();
    tenant.accountId = rows[0]["tenancy_name"].as<std::string>();
    tenant.name = rows[0]["name"].as<std::string>();
    if (tenant.name.empty()) tenant.name = tenant.accountId;
    tenant.requireTwoFactorAuth = rows[0]["require_two_factor_auth"].as<bool>();
    co_return tenant;
}
}
