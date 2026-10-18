// Production JWT filters and PermissionService with injected persistence failures.
#include "domain_services/permissions/PermissionService.h"
#include "filters/HostJwtAuthFilter.h"
#include "filters/TenantJwtAuthFilter.h"
#include "constants/TenantConstants.h"
#include "utils/AuditUtil.h"
#include "Users.h"
#include "Tenants.h"
#include "Roles.h"
#include "UserGroups.h"
#include <jwt-cpp/jwt.h>
using namespace business_desk;
using namespace drogon_model::BusinessDesk;
using namespace drogon::orm;
extern void check(bool, const char *);
namespace {
struct Outcome {
    drogon::HttpRequestPtr request = std::make_shared<drogon::HttpRequest>();
    int status = 0, allowed = 0, denied = 0;
};
Outcome run(const std::string &token, bool host = false, bool options = false) {
    Outcome result;
    result.request->authorization = "Bearer " + token;
    if (options) result.request->method = drogon::Options;
    // Stale upstream attributes must never survive authentication resolution.
    result.request->attributes()->insert("permissions", std::unordered_set<std::string>{"forged"});
    result.request->attributes()->insert("hostUserId", std::string("untrusted"));
    result.request->attributes()->insert("tenantId", std::string("untrusted"));
    auto denied = [&](const auto &response) {
        ++result.denied;
        result.status = response->status;
        check(response->headers.at("Cache-Control")=="no-store", "auth failures are not cached");
        check(response->body.toStyledString().find("private-db-detail") == std::string::npos,
              "auth failures do not expose database details");
    };
    auto next = [&] { ++result.allowed; };
    if (host) HostJwtAuthFilter{}.doFilter(result.request, denied, next);
    else TenantJwtAuthFilter{}.doFilter(result.request, denied, next);
    check(result.allowed + result.denied == 1, "exactly one auth callback");
    return result;
}
bool has(const Outcome &result, const char *permission) {
    return domain_services::PermissionService::hasPermission(result.request, permission);
}
void rejected(const std::string &token, int status, bool host = false) {
    const auto result = run(token, host);
    check(result.status == status && !result.allowed, "request rejected with expected status");
    check(!result.request->attributes()->find("permissions"), "denied request has no permission set");
    check(utils::extractAuditIdentity(result.request).userId.empty(), "denied request has no audit actor");
}
}
void checkRequestAuthorization() {
    CoroMapper<Users>::rows.clear(); CoroMapper<Tenants>::rows.clear();
    CoroMapper<Roles>::rows.clear(); CoroMapper<UserGroups>::rows.clear();
    CoroMapper<Users> users(0); CoroMapper<Tenants> tenants(0);
    CoroMapper<Roles> roles(0); CoroMapper<UserGroups> groups(0);
    auto &cfg = drogon::app().config["JwtBearer"];
    cfg["JwtSecurityKey"]="authorization-tests-only";
    cfg["JwtIssuer"]="test-issuer"; cfg["JwtAudience"]="test-audience";
    auto mint = [&](bool host, const std::string &userId, const std::string &tenantId,
                    const std::string &issuer = "test-issuer", const std::string &subject = "") {
        auto token = jwt::create().set_issuer(issuer).set_audience("test-audience")
            .set_expires_at(std::chrono::system_clock::now() + std::chrono::hours(1))
            // Even a correctly signed stale permission claim must grant nothing.
            .set_payload_claim("permissions", jwt::claim(std::string("[\"forged\"]")));
        if (host) {
            token.set_payload_claim("hostUserId", jwt::claim(userId));
            if (!tenantId.empty()) token.set_payload_claim("tenantId", jwt::claim(tenantId));
        }
        else token.set_payload_claim("tenantUserId", jwt::claim(userId))
                  .set_payload_claim("tenantId", jwt::claim(tenantId));
        if (!subject.empty()) token.set_subject(subject);
        return token.sign(jwt::algorithm::hs256{cfg["JwtSecurityKey"].asString()});
    };
    Tenants tenant; tenant.setId("a"); tenant.setName("Current tenant");
    tenant.setIsActive(true); tenant.setIsDeleted(false); tenants.insert(tenant).get();
    Users user; user.setId("u"); user.setTenantId("a"); user.setIsHostAdminUser(false);
    user.setIsActive(true); user.setIsLockedOut(false); user.setIsDeleted(false);
    user.setUsername("current-name"); user.setEmail("current@example.com");
    user.setRoles("[\"direct\",\"foreign\",\"missing\"]"); user.setUserGroups("[\"group\",\"removed\"]"); users.insert(user).get();
    Roles direct; direct.setId("direct"); direct.setTenantId("a"); direct.setPermissions("[\"direct.read\"]"); roles.insert(direct).get();
    Roles grouped; grouped.setId("grouped"); grouped.setTenantId("a"); grouped.setPermissions("[\"group.read\"]"); roles.insert(grouped).get();
    Roles foreign; foreign.setId("foreign"); foreign.setTenantId("b"); foreign.setPermissions("[\"foreign\"]"); roles.insert(foreign).get();
    UserGroups group; group.setId("group"); group.setIsDeleted(false);
    group.setRoles("[{\"id\":\"grouped\"},\"foreign\"]"); groups.insert(group).get();
    const auto token = mint(false,"u","a");
    auto result = run(token);
    check(result.allowed && has(result,"direct.read") && has(result,"group.read"), "live direct and group roles granted");
    check(!has(result,"forged") && !has(result,"foreign"), "JWT and cross-tenant permissions ignored");
    check(result.request->attributes()->get<std::string>("tenantUserEmail")=="current@example.com", "email comes from current user");
    check(result.request->attributes()->get<std::string>("tenantName")=="Current tenant", "tenant name comes from database");
    check(!result.request->attributes()->find("hostUserId"), "tenant filter clears stale host identity");

    direct.setPermissions("[\"direct.changed\"]"); roles.update(direct).get(); result = run(token);
    check(has(result,"direct.changed") && !has(result,"direct.read"), "role edits apply to same token next request");
    user.setRoles("[]"); users.update(user).get(); result = run(token);
    check(!has(result,"direct.changed") && has(result,"group.read"), "direct role removal applies immediately");
    group.setIsDeleted(true); groups.update(group).get(); result = run(token);
    check(result.allowed && !has(result,"group.read"), "deleted group immediately revokes its grant");
    group.setIsDeleted(false); group.setRoles("[]"); groups.update(group).get(); result = run(token);
    check(!has(result,"group.read"), "group role removal applies immediately");
    group.setRoles("[\"grouped\"]"); groups.update(group).get();
    user.setUserGroups("[]"); users.update(user).get(); check(!has(run(token),"group.read"), "membership removal applies immediately");
    user.setRoles("[\"direct\"]"); user.setUserGroups("[\"group\"]"); users.update(user).get();

    rejected(mint(false,"","a"),401);
    rejected(mint(false,"u",""),401);
    rejected(mint(true,"",""),401,true);
    rejected(mint(true,"u","a"),401,true);
    rejected(mint(false,"absent","a"),401);
    rejected(mint(false,"u","b"),401);
    rejected(mint(false,"u","a","wrong-issuer"),401);
    rejected(mint(false,"u","a","test-issuer","other-user"),401);
    rejected(mint(true,"u",""),401,true);
    user.setIsLockedOut(true); users.update(user).get(); rejected(token,401);
    user.setIsLockedOut(false); user.setIsActive(false); users.update(user).get(); rejected(token,401);
    user.setIsActive(true); user.setIsDeleted(true); users.update(user).get(); rejected(token,401);
    user.setIsDeleted(false); user.setTenantId("b"); users.update(user).get(); rejected(token,401);
    user.setTenantId("a"); users.update(user).get();
    tenant.setIsActive(false); tenants.update(tenant).get(); rejected(token,401);
    tenant.setIsActive(true); tenant.setIsDeleted(true); tenants.update(tenant).get(); rejected(token,401);
    tenant.setIsDeleted(false); tenants.update(tenant).get();
    CoroMapper<Tenants>::rows.clear(); rejected(token,401); tenants.insert(tenant).get();

    CoroMapper<Users>::failQueries=true; rejected(token,503); CoroMapper<Users>::failQueries=false;
    CoroMapper<Tenants>::failQueries=true; rejected(token,503); CoroMapper<Tenants>::failQueries=false;
    CoroMapper<UserGroups>::failQueries=true; rejected(token,503); CoroMapper<UserGroups>::failQueries=false;
    CoroMapper<Roles>::failQueries=true; rejected(token,503); CoroMapper<Roles>::failQueries=false;
    CoroMapper<Roles>::queriesBeforeFailure=1; rejected(token,503); CoroMapper<Roles>::queriesBeforeFailure=-1;
    group.setRoles("broken-json"); groups.update(group).get(); rejected(token,503);
    group.setRoles("[\"grouped\"]"); groups.update(group).get();
    direct.setPermissions("[\"partial.grant\",1]"); roles.update(direct).get(); rejected(token,503);
    direct.setPermissions("[\"direct.read\"]"); roles.update(direct).get();
    check(run(token).allowed, "authorization recovers when database state restored");

    // Both supported host representations, and host/tenant realm boundaries.
    user.setTenantIdToNull(); user.setIsHostAdminUser(true); user.setRoles("[\"direct\"]"); user.setUserGroups("[]"); users.update(user).get();
    direct.setTenantIdToNull(); roles.update(direct).get();
    const auto hostToken = mint(true,"u","");
    result = run(hostToken,true);
    check(result.allowed && has(result,"direct.read"), "legacy NULL-tenant host authorized");
    check(!result.request->attributes()->find("tenantId"), "host filter clears stale tenant identity");
    rejected(token,401);
    user.setTenantId("a"); users.update(user).get(); rejected(hostToken,401,true);
    tenant.setId(constants::kHostTenantId); tenants.insert(tenant).get();
    user.setTenantId(constants::kHostTenantId); users.update(user).get();
    direct.setTenantId(constants::kHostTenantId); roles.update(direct).get();
    check(has(run(hostToken,true),"direct.read"), "protected host tenant role authorized");
    tenant.setIsActive(false); tenants.update(tenant).get(); rejected(hostToken,401,true);
    tenant.setIsActive(true); tenant.setIsDeleted(true); tenants.update(tenant).get(); rejected(hostToken,401,true);
    tenant.setIsDeleted(false); tenants.update(tenant).get();
    user.setIsLockedOut(true); users.update(user).get(); rejected(hostToken,401,true);
    user.setIsLockedOut(false); user.setIsActive(false); users.update(user).get(); rejected(hostToken,401,true);
    user.setIsActive(true); user.setIsDeleted(true); users.update(user).get(); rejected(hostToken,401,true);
    user.setIsDeleted(false); user.setIsHostAdminUser(false); users.update(user).get();
    rejected(mint(false,"u",constants::kHostTenantId),401);
    cfg["JwtSecurityKey"]=""; rejected(token,503);
    cfg["JwtSecurityKey"]="authorization-tests-only";
    cfg["JwtAudience"]=Json::arrayValue; rejected(token,503);
    cfg["JwtAudience"]="test-audience";
    CoroMapper<Users>::failQueries=true;
    check(run("",false,true).allowed && run("",true,true).allowed, "OPTIONS bypasses JWT and database resolution");
    CoroMapper<Users>::failQueries=false;
}
