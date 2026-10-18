#include "TenantService.h"
#include "TenantSql.h"
#include "Tenants.h"
#include "constants/TenantConstants.h"
#include <drogon/orm/CoroMapper.h>
#include <bcrypt.h>
#include <openssl/rand.h>
#include <algorithm>
#include <cctype>
#include <set>
#include <stdexcept>

using namespace drogon::orm;
using drogon_model::BusinessDesk::Tenants;

namespace business_desk::domain_services {
namespace {
dto::BaseApiResponse error(const std::string &code, const std::string &message) {
    dto::BaseApiResponse r;
    r.message = message; r.error["code"] = code; r.error["message"] = message;
    return r;
}
bool host(const utils::AuditIdentity &identity) { return identity.hasUser() && !identity.hasTenant(); }
bool uuid(const std::string &value) {
    if (value.size() != 36) return false;
    for (size_t i=0; i<value.size(); ++i) {
        if (i==8 || i==13 || i==18 || i==23) { if (value[i]!='-') return false; }
        else if (!std::isxdigit(static_cast<unsigned char>(value[i]))) return false;
    }
    return true;
}
Criteria live() { return Criteria(Tenants::Cols::_is_deleted, CompareOperator::EQ, false); }
Criteria byId(const std::string &id) { return live() && Criteria(Tenants::Cols::_id, CompareOperator::EQ, id); }
std::string lower(std::string value) {
    std::transform(value.begin(),value.end(),value.begin(),[](unsigned char c){return std::tolower(c);});
    return value;
}
std::string validate(const dto::TenantDto &input, bool creating) {
    if (creating || input.hasTenancyName()) {
        if (input.getTenancyName().empty() || input.getTenancyName().size()>64)
            return "tenancyName must contain 1 to 64 letters, digits, hyphens or underscores.";
        for (unsigned char c : input.getTenancyName())
            if (!((c>='a'&&c<='z') || (c>='A'&&c<='Z') || (c>='0'&&c<='9') || c=='-' || c=='_'))
                return "Invalid tenancyName.";
        if (lower(input.getTenancyName()) == constants::kHostTenancyName) return "The host tenancy name is reserved.";
    }
    if (creating || input.hasName()) {
        if (input.getName().empty() || input.getName().size()>128 ||
            std::all_of(input.getName().begin(),input.getName().end(),[](unsigned char c){return std::isspace(c);}))
            return "name must contain 1 to 128 characters and cannot be blank.";
    }
    if (creating || input.hasAdminEmailAddress()) {
        const auto &email = input.getAdminEmailAddress();
        auto at = email.find('@');
        if (email.size()>255 || at==std::string::npos || at==0 || at+1==email.size() || email.find('@',at+1)!=std::string::npos ||
            std::any_of(email.begin(),email.end(),[](unsigned char c){return std::isspace(c) || c<32;}))
            return "A valid adminEmailAddress is required.";
    }
    if (input.getConnectionString().size()>1024) return "connectionString cannot exceed 1024 characters.";
    return {};
}
Json::Value publicTenant(const Tenants &tenant) {
    auto raw = tenant.toJson();
    Json::Value out(Json::objectValue);
    out["id"] = raw["id"]; out["tenancyName"] = raw["tenancy_name"]; out["name"] = raw["name"];
    out["isActive"] = raw["is_active"]; out["createdAt"] = raw["creation_time"];
    out["lastModifiedAt"] = raw["last_modification_time"];
    // connection_string and billing/account secrets must never leave the service.
    return out;
}
void collectPermissions(const Json::Value &groups, std::set<std::string> &permissions) {
    if (!groups.isArray()) return;
    for (const auto &entry : groups) {
        if (entry["systemName"].isString()) permissions.insert(entry["systemName"].asString());
        collectPermissions(entry["subPermissions"],permissions);
    }
}
std::string adminPermissions() {
    std::set<std::string> permissions;
    collectPermissions(drogon::app().getCustomConfig()["AdminPermissions"],permissions);
    Json::Value array(Json::arrayValue);
    for (const auto &permission : permissions) array.append(permission);
    return Json::FastWriter().write(array);
}
std::string password() {
    unsigned char bytes[24];
    if (RAND_bytes(bytes,sizeof(bytes))!=1) throw std::runtime_error("Secure random generator unavailable");
    constexpr char alphabet[]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    std::string result;
    for (unsigned char byte : bytes) result += alphabet[byte & 63];
    return result;
}
drogon::Task<bool> duplicateName(const std::string &name, const std::string &selfId) {
    // LOWER is matched by the unique live-name index in migration 002.
    const auto rows = co_await drogon::app().getDbClient()->execSqlCoro(
        "SELECT id FROM tenants WHERE is_deleted = false AND lower(tenancy_name) = lower($1) AND id::text <> $2 LIMIT 1",
        name, selfId);
    co_return !rows.empty();
}
drogon::Task<dto::BaseApiResponse> changeStatus(const std::string &id, const utils::AuditIdentity &identity, bool active, bool deleting) {
    if (!host(identity)) co_return error("forbidden","Host identity required.");
    if (!uuid(id)) co_return error("validation_error","Invalid tenant id.");
    if (id==constants::kHostTenantId) co_return error("forbidden","The default host tenant is protected.");
    try {
        CoroMapper<Tenants> mapper(drogon::app().getDbClient());
        auto tenant = co_await mapper.findOne(byId(id));
        tenant.setIsActive(active);
        utils::applyUpdateAudit(tenant,identity);
        if (deleting) { tenant.setIsDeleted(true); utils::applyDeleteAudit(tenant,identity); }
        co_await mapper.update(tenant);
        dto::BaseApiResponse r; r.success=true;
        if (deleting) { r.result["id"]=id; r.result["deleted"]=true; }
        else r.result=publicTenant(tenant);
        co_return r;
    } catch (const UnexpectedRows &) { co_return error("not_found","Tenant not found."); }
    catch (const DrogonDbException &) { co_return error("database_error","Unable to change tenant status."); }
}
}

drogon::Task<dto::BaseApiResponse> TenantService::getAllTenants(int pageNo,int pageSize,const std::string &query,const utils::AuditIdentity &identity) {
    if (!host(identity)) co_return error("forbidden","Host identity required.");
    pageNo=std::max(1,pageNo); pageSize=std::clamp(pageSize,1,200);
    auto criteria=live();
    if (!query.empty()) criteria=criteria && (Criteria(Tenants::Cols::_tenancy_name,CompareOperator::Like,"%"+query+"%") ||
        Criteria(Tenants::Cols::_name,CompareOperator::Like,"%"+query+"%"));
    try {
        CoroMapper<Tenants> mapper(drogon::app().getDbClient());
        const auto total=co_await mapper.count(criteria);
        const size_t offset=static_cast<size_t>(pageNo-1)*pageSize;
        const auto rows=co_await mapper.orderBy(Tenants::Cols::_tenancy_name).limit(pageSize).offset(offset).findBy(criteria);
        dto::BaseApiResponse r; r.success=true; r.result["data"]=Json::arrayValue;
        for (const auto &row : rows) r.result["data"].append(publicTenant(row));
        r.result["totalCount"]=Json::UInt64(total); r.result["pageNo"]=pageNo; r.result["pageSize"]=pageSize;
        r.result["totalPages"]=Json::UInt64((total+pageSize-1)/pageSize);
        r.result["lowerBound"]=Json::UInt64(rows.empty()?0:offset+1);
        r.result["upperBound"]=Json::UInt64(rows.empty()?0:offset+rows.size());
        co_return r;
    } catch (const DrogonDbException &) { co_return error("database_error","Unable to list tenants."); }
}
drogon::Task<dto::BaseApiResponse> TenantService::getTenant(const std::string &id,const utils::AuditIdentity &identity) {
    if (!host(identity)) co_return error("forbidden","Host identity required.");
    if (!uuid(id)) co_return error("validation_error","Invalid tenant id.");
    try {
        CoroMapper<Tenants> mapper(drogon::app().getDbClient());
        auto row=co_await mapper.findOne(byId(id));
        dto::BaseApiResponse r; r.success=true; r.result=publicTenant(row); co_return r;
    } catch (const UnexpectedRows &) { co_return error("not_found","Tenant not found."); }
    catch (const DrogonDbException &) { co_return error("database_error","Unable to fetch tenant."); }
}
drogon::Task<dto::BaseApiResponse> TenantService::createTenant(const dto::TenantDto &input,const utils::AuditIdentity &identity) {
    if (!host(identity)) co_return error("forbidden","Host identity required.");
    const auto validation=validate(input,true);
    if (!validation.empty()) co_return error("validation_error",validation);
    try {
        if (co_await duplicateName(input.getTenancyName(),"")) co_return error("conflict","Tenancy name already exists.");
        const auto temporaryPassword=password();
        const auto hash=bcrypt::generateHash(temporaryPassword,12);
        const auto rows=co_await drogon::app().getDbClient()->execSqlCoro(tenant_sql::create,
            input.getTenancyName(),input.getName(),input.getConnectionString(),identity.userId,
            lower(input.getAdminEmailAddress()),adminPermissions(),hash);
        if (rows.size()!=1) co_return error("database_error","Tenant provisioning failed.");
        dto::BaseApiResponse r; r.success=true; r.message="Tenant and initial administrator created.";
        r.result["id"]=rows[0]["tenant_id"].as<std::string>();
        r.result["tenancyName"]=rows[0]["tenancy_name"].as<std::string>();
        r.result["name"]=rows[0]["name"].as<std::string>();
        r.result["adminUserId"]=rows[0]["admin_user_id"].as<std::string>();
        r.result["adminUsername"]="admin"; r.result["adminEmailAddress"]=lower(input.getAdminEmailAddress());
        r.result["temporaryPassword"]=temporaryPassword;
        co_return r;
    } catch (const UniqueViolation &) { co_return error("conflict","A tenant or administrator with those identifiers already exists."); }
    catch (const DrogonDbException &) { co_return error("database_error","Tenant provisioning failed; no tenant was created."); }
    catch (const std::exception &) { co_return error("internal_error","Unable to provision tenant securely."); }
}
drogon::Task<dto::BaseApiResponse> TenantService::updateTenant(const dto::TenantDto &input,const std::string &id,const utils::AuditIdentity &identity) {
    if (!host(identity)) co_return error("forbidden","Host identity required.");
    if (!uuid(id)) co_return error("validation_error","Invalid tenant id.");
    if (id==constants::kHostTenantId) co_return error("forbidden","The default host tenant is protected.");
    const auto validation=validate(input,false);
    if (!validation.empty()) co_return error("validation_error",validation);
    try {
        CoroMapper<Tenants> mapper(drogon::app().getDbClient());
        co_await mapper.findOne(byId(id));
        if (input.hasTenancyName() && (co_await duplicateName(input.getTenancyName(),id)))
            co_return error("conflict","Tenancy name already exists.");
        const auto rows=co_await drogon::app().getDbClient()->execSqlCoro(tenant_sql::update,id,
            input.hasTenancyName(),input.getTenancyName(),input.hasName(),input.getName(),
            input.hasConnectionString(),input.getConnectionString(),identity.userId,
            input.hasAdminEmailAddress(),lower(input.getAdminEmailAddress()));
        if (rows.empty()) co_return error("not_found","Tenant or its live administrator was not found.");
        dto::BaseApiResponse r; r.success=true; r.result["id"]=id;
        r.result["tenancyName"]=rows[0]["tenancy_name"].as<std::string>();
        r.result["name"]=rows[0]["name"].as<std::string>(); r.result["isActive"]=rows[0]["is_active"].as<bool>();
        co_return r;
    } catch (const UnexpectedRows &) { co_return error("not_found","Tenant not found."); }
    catch (const UniqueViolation &) { co_return error("conflict","A tenant or administrator with those identifiers already exists."); }
    catch (const DrogonDbException &) { co_return error("database_error","Unable to update tenant."); }
}
drogon::Task<dto::BaseApiResponse> TenantService::activateTenant(const std::string &id,const utils::AuditIdentity &identity) {
    co_return co_await changeStatus(id,identity,true,false);
}
drogon::Task<dto::BaseApiResponse> TenantService::deActivateTenant(const std::string &id,const utils::AuditIdentity &identity) {
    co_return co_await changeStatus(id,identity,false,false);
}
drogon::Task<dto::BaseApiResponse> TenantService::deleteTenant(const std::string &id,const utils::AuditIdentity &identity) {
    co_return co_await changeStatus(id,identity,false,true);
}
}
