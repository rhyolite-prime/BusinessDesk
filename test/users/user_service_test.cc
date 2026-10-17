// In-memory persistence seam with real bcrypt and jwt-cpp/OpenSSL implementations.
#include "domain_services/users/UserService.h"
#include "domain_services/permissions/PermissionService.h"
#include "Users.h"
#include "Tenants.h"
#include "UserGroups.h"
#include "Roles.h"
#include <bcrypt.h>
#include <jwt-cpp/jwt.h>
#include <iostream>
#include "filters/HostJwtAuthFilter.h"
#include "filters/TenantJwtAuthFilter.h"
using namespace business_desk;
using namespace drogon_model::BusinessDesk;
using namespace drogon::orm;
int checks=0;
void check(bool ok,const char *name) { ++checks; if(!ok) { std::cerr<<"FAIL: "<<name<<"\n"; std::exit(1); } }
template<class Filter> bool accepts(const std::string &token) {
 Filter filter;
 auto request=std::make_shared<drogon::HttpRequest>();
 request->authorization="Bearer "+token;
 bool allowed=false, denied=false;
 filter.doFilter(request, [&](const auto &response) { denied=response->status==401; }, [&] { allowed=true; });
 return allowed && !denied;
}
int main() {
 domain_services::UserService service;
 auto &cfg=drogon::app().config["JwtBearer"];
 cfg["JwtSecurityKey"]="test-only-secret-never-use-in-production";
 cfg["JwtIssuer"]="test-issuer"; cfg["JwtAudience"]="test-audience"; cfg["JwtExpirationTime"]=3600;
 CoroMapper<Users> users(0); CoroMapper<Tenants> tenants(0); CoroMapper<Roles> roles(0); CoroMapper<UserGroups> groups(0);
 Tenants tenant; tenant.setId("tenant-a"); tenant.setTenancyName("acme"); tenant.setName("Acme"); tenant.setIsActive(true); tenant.setIsDeleted(false); tenants.insert(tenant).get();
 dto::RoleItem item{"role-h","Host role"};
 Roles role; role.setId("role-h"); role.setPermissions("[\"users.read\"]"); role.setTenantIdToNull(); roles.insert(role).get();
 utils::AuditIdentity host{"","operator"}, tenantIdentity{"tenant-a","operator-a"};
 dto::UserDto input; input.setEmail("HOST@example.com"); input.setUsername("ADMIN"); input.setPassword("test-password");
 auto created=service.createUser(input,host).get(); check(created.success,"create host"); auto hostId=created.result["id"].asString();
 check(users.rows[0].getValueOfTenantId().empty(),"host tenant is null");
 check(users.rows[0].getValueOfPasswordHash()!="test-password","password hashed");
 check(!service.createUser(input,host).get().success,"duplicate rejected");
 check(!service.createUser(input,{}).get().success,"anonymous create rejected");
 dto::UserGroupDto group; group.setTitle("Operators"); group.setRoles({item});
 check(group.hasRoles(),"setter records presence");
 auto madeGroup=service.createUserGroup(group,host).get(); check(madeGroup.success,"create group"); auto groupId=madeGroup.result["userGroupId"].asString();
 auto hostRow=users.findByPrimaryKey(hostId).get(); hostRow.setUserGroups("[\""+groupId+"\"]"); users.update(hostRow).get();
 dto::SigninDto login; login.setUsernameOrEmail("ADMIN"); login.setPassword("test-password");
 dto::UserDto update; update.setFirstName("Updated");
 check(service.updateUser(update,hostId,host).get().success,"update host user");
 check(users.findByPrimaryKey(hostId).get().getValueOfFirstName()=="Updated","user update persisted");
 check(users.findByPrimaryKey(hostId).get().getValueOfTenantId().empty(),"update preserves host scope");
 dto::UserGroupDto rename; rename.setTitle("Renamed operators");
 check(service.updateUserGroup(rename,groupId,host).get().success,"update group");
 check(groups.findByPrimaryKey(groupId).get().getValueOfCreatedByUserId()=="operator","group create actor preserved");
 check(groups.findByPrimaryKey(groupId).get().getValueOfLastModifiedByUserId()=="operator","group update actor");
 auto auth=service.validateHostUserCredentials(login).get(); check(auth.success,"host signin");
 auto token=jwt::decode(auth.result["token"].asString());
 jwt::verify().allow_algorithm(jwt::algorithm::hs256{cfg["JwtSecurityKey"].asString()}).with_issuer("test-issuer").with_audience("test-audience").verify(token);
 check(token.get_payload_claim("hostUserId").as_string()==hostId,"host identity claim");
 check(!token.has_payload_claim("tenantId"),"host has no tenant claims");
 {
  HostJwtAuthFilter filter;
  auto req=std::make_shared<drogon::HttpRequest>(); req->authorization="Bearer "+auth.result["token"].asString();
  filter.doFilter(req,[](auto &){},[]{});
  check(utils::extractAuditIdentity(req).userId==hostId,"host filter publishes audit identity");
  check(domain_services::PermissionService::hasPermission(req,"users.read"),"filter publishes permissions");
 }

 check(accepts<HostJwtAuthFilter>(auth.result["token"].asString()),"host filter accepts host token");
 check(!accepts<TenantJwtAuthFilter>(auth.result["token"].asString()),"tenant filter rejects host token");

 Json::Value perms; Json::Reader reader; check(reader.parse(token.get_payload_claim("permissions").as_string(),perms),"permissions encoded as JSON string");
 check(perms.size()==1 && perms[0].asString()=="users.read","group object roles resolved");
 auto lifetime=std::chrono::duration_cast<std::chrono::seconds>(token.get_expires_at()-token.get_issued_at()).count(); check(lifetime==3600,"configured expiry");
 login.setPassword("bad"); check(!service.validateHostUserCredentials(login).get().success,"bad password"); login.setPassword("test-password");
 auto tenantCreated=service.createUser(input,tenantIdentity).get(); check(tenantCreated.success,"same identifier across tenants"); auto tenantUserId=tenantCreated.result["id"].asString();
 check(service.getAllUsers(1,20,"tenant-a","").get().result["totalCount"].asUInt64()==1,"tenant list isolated");
 check(service.getAllUsers(1,20,"","").get().result["totalCount"].asUInt64()==1,"host list isolated");
 check(service.getAllUsers(0,0,"","").get().result["pageSize"].asInt()==1,"pagination normalized");
 check(service.getAllUsers(999,20,"","").get().result["upperBound"].asUInt64()==0,"out of range page");
 check(!service.updateUser(input,hostId,tenantIdentity).get().success,"cross-tenant update rejected");
 check(!service.deleteUser(hostId,tenantIdentity).get().success,"cross-tenant delete rejected");
 login.setAccountId("acme"); auto tenantAuth=service.validateTenantUserCredentials(login).get(); check(tenantAuth.success,"ordinary tenant user signin");
 auto tt=jwt::decode(tenantAuth.result["token"].asString()); check(tt.get_payload_claim("tenantUserId").as_string()==tenantUserId,"tenant user claim");
 check(tt.get_payload_claim("tenantId").as_string()=="tenant-a","tenant id claim");
 {
  TenantJwtAuthFilter filter;
  auto req=std::make_shared<drogon::HttpRequest>(); req->authorization="Bearer "+tenantAuth.result["token"].asString();
  filter.doFilter(req,[](auto &){},[]{});
  auto identity=utils::extractAuditIdentity(req);
  check(identity.userId==tenantUserId && identity.tenantId=="tenant-a","tenant filter publishes audit identity");
 }

 check(accepts<TenantJwtAuthFilter>(tenantAuth.result["token"].asString()),"tenant filter accepts tenant token");
 check(!accepts<HostJwtAuthFilter>(tenantAuth.result["token"].asString()),"host filter rejects tenant token");
 auto invalid=auth.result["token"].asString(); invalid[invalid.size()-5] = invalid[invalid.size()-5]=='a' ? 'b' : 'a';
 check(!accepts<HostJwtAuthFilter>(invalid),"tampered signature rejected");
 auto mint=[&](int lifetime, bool expiration, const std::string &audience, const std::string &permissions) {
  auto b=jwt::create().set_issuer("test-issuer").set_audience(audience)
   .set_payload_claim("hostUserId",jwt::claim(std::string("h")))
   .set_payload_claim("hostUserEmail",jwt::claim(std::string("h@example.com")))
   .set_payload_claim("hostUserName",jwt::claim(std::string("h")))
   .set_payload_claim("permissions",jwt::claim(permissions));
  if(expiration) b.set_expires_at(std::chrono::system_clock::now()+std::chrono::seconds(lifetime));
  return b.sign(jwt::algorithm::hs256{cfg["JwtSecurityKey"].asString()});
 };
 check(!accepts<HostJwtAuthFilter>(mint(-60,true,"test-audience","[]")),"expired token rejected");
 check(!accepts<HostJwtAuthFilter>(mint(3600,false,"test-audience","[]")),"missing expiration rejected");
 check(!accepts<HostJwtAuthFilter>(mint(3600,true,"wrong","[]")),"wrong audience rejected");
 check(!accepts<HostJwtAuthFilter>(mint(3600,true,"test-audience","not-json")),"invalid permissions rejected");

 check(tt.get_payload_claim("tenantName").as_string()=="Acme","tenant name claim"); check(!tt.has_payload_claim("hostUserId"),"tenant has no host claims");
 check(!service.validateHostUserCredentials(login).get().success,"host rejects accountId");
 login.setAccountId("missing"); check(!service.validateTenantUserCredentials(login).get().success,"unknown tenant");
 login.setAccountId(""); check(!service.validateTenantUserCredentials(login).get().success,"tenant id required");
 tenant.setIsActive(false); tenants.update(tenant).get(); login.setAccountId("acme"); check(!service.validateTenantUserCredentials(login).get().success,"inactive tenant"); tenant.setIsActive(true); tenants.update(tenant).get();
 auto locked=users.findByPrimaryKey(tenantUserId).get(); locked.setIsLockedOut(true); users.update(locked).get();
 check(!service.validateTenantUserCredentials(login).get().success,"locked user rejected");
 locked.setIsLockedOut(false); locked.setIsActive(false); users.update(locked).get();
 check(!service.validateTenantUserCredentials(login).get().success,"inactive user rejected");
 locked.setIsActive(true); users.update(locked).get();
 Roles foreignRole; foreignRole.setId("role-other"); foreignRole.setTenantId("tenant-other"); foreignRole.setPermissions("[\"foreign.permission\"]"); roles.insert(foreignRole).get();
 locked.setRoles("[\"role-other\"]"); users.update(locked).get();
 check(domain_services::PermissionService::getUserPermissions(tenantUserId).get().empty(),"foreign tenant role grants nothing");
 check(!service.createUserGroup(group,tenantIdentity).get().success,"tenant cannot mutate global groups");
 dto::UserGroupDto cycle; cycle.setParentId(groupId); check(cycle.hasParentId(),"parent setter presence"); check(!service.updateUserGroup(cycle,groupId,host).get().success,"self parent rejected");
 dto::UserGroupDto child; child.setTitle("Child"); child.setParentId(groupId);
 auto childResponse=service.createUserGroup(child,host).get(); check(childResponse.success,"valid child group");
 auto childId=childResponse.result["userGroupId"].asString();
 check(!service.deleteUserGroup(groupId,host).get().success,"parent deletion blocked");
 dto::UserGroupDto ancestorCycle; ancestorCycle.setParentId(childId);
 check(!service.updateUserGroup(ancestorCycle,groupId,host).get().success,"ancestor cycle rejected");
 check(service.deleteUserGroup(childId,host).get().success,"delete child group");
 check(service.deleteUserGroup(groupId,host).get().success,"soft-delete group");
 check(groups.findByPrimaryKey(groupId).get().getValueOfDeletedByUserId()=="operator","group delete actor");

 check(domain_services::PermissionService::getUserPermissions(hostId).get().empty(),"deleted group grants no permissions");
 check(service.getAllUserGroups(1,20,"","").get().result["totalCount"].asUInt64()==0,"deleted groups excluded");
 check(!service.validateUserPasskeys(dto::PasskeyLoginDto{}).get().success,"passkeys fail closed");
 check(!service.deleteUser(hostId,{"",hostId}).get().success,"self deactivation rejected");
 check(service.deleteUser(tenantUserId,tenantIdentity).get().success,"deactivate user");
 check(!service.validateTenantUserCredentials(login).get().success,"deactivated user cannot login");
 cfg["JwtExpirationTime"]=0; login.setAccountId("");
 check(!service.validateHostUserCredentials(login).get().success,"invalid lifetime rejected");
 cfg["JwtExpirationTime"]=3600;
 cfg["JwtSecurityKey"]=""; login.setAccountId(""); check(!service.validateHostUserCredentials(login).get().success,"empty signing key rejected");
 std::cout<<checks<<" checks passed\n";
}
