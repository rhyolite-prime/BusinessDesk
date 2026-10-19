// In-memory persistence seam with real bcrypt and jwt-cpp/OpenSSL implementations.
#include "domain_services/users/UserService.h"
#include "domain_services/permissions/PermissionService.h"
#include "Users.h"
#include "Tenants.h"
#include "UserGroups.h"
#include "Roles.h"
#include "constants/TenantConstants.h"
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
void checkTotpLogin();
void checkRequestAuthorization();
void checkAccountHeads();
void checkAccountControls();
void checkAccountDetails();
void checkAccountingUnits();
void checkGlSoftDeletes();
void checkUserRoutes();
int main() {
 checkGlSoftDeletes();
 checkAccountHeads();
 checkAccountControls();
 checkAccountDetails();
 checkAccountingUnits();
 checkUserRoutes();
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
 check(!users.rows[0].getValueOfIsDeleted(),"create explicitly marks user live");
 check(users.rows[0].getValueOfCreatedByUserId()=="operator","create stamps user creator");
 check(users.rows[0].getValueOfLastModifiedByUserId()=="operator","create stamps initial modifier");
 check(!users.rows[0].toJson()["created_at"].isNull(),"create stamps creation time");
 check(!users.rows[0].toJson()["last_modified_at"].isNull(),"create stamps initial modification time");
 check(users.rows[0].getValueOfPasswordHash()!="test-password","password hashed");
 check(!service.createUser(input,host).get().success,"duplicate rejected");
 check(!service.createUser(input,{}).get().success,"anonymous create rejected");
 dto::UserGroupDto group; group.setTitle("Operators"); group.setRoles({item});
 check(group.hasRoles(),"setter records presence");
 auto madeGroup=service.createUserGroup(group,host).get(); check(madeGroup.success,"create group"); auto groupId=madeGroup.result["userGroupId"].asString();
 auto hostRow=users.findByPrimaryKey(hostId).get(); hostRow.setUserGroups("[\""+groupId+"\"]"); users.update(hostRow).get();
 dto::SigninDto login; login.setUsernameOrEmail("ADMIN"); login.setPassword("test-password");
 auto originalHash=users.findByPrimaryKey(hostId).get().getValueOfPasswordHash();
 dto::UserDto update; update.setFirstName("Updated");
 check(service.updateUser(update,hostId,{"","editor"}).get().success,"update host user");
 check(users.findByPrimaryKey(hostId).get().getValueOfFirstName()=="Updated","user update persisted");
 check(users.findByPrimaryKey(hostId).get().getValueOfPasswordHash()==originalHash,"update without password preserves hash");
 check(users.findByPrimaryKey(hostId).get().getValueOfCreatedByUserId()=="operator","update preserves creator");
 check(users.findByPrimaryKey(hostId).get().getValueOfLastModifiedByUserId()=="editor","update stamps modifier");
 check(!users.findByPrimaryKey(hostId).get().toJson()["last_modified_at"].isNull(),"update stamps modification time");
 check(users.findByPrimaryKey(hostId).get().getValueOfTenantId().empty(),"update preserves host scope");
 dto::UserGroupDto rename; rename.setTitle("Renamed operators");
 check(service.updateUserGroup(rename,groupId,host).get().success,"update group");
 check(groups.findByPrimaryKey(groupId).get().getValueOfCreatedByUserId()=="operator","group create actor preserved");
 check(groups.findByPrimaryKey(groupId).get().getValueOfLastModifiedByUserId()=="operator","group update actor");
 auto auth=service.validateHostUserCredentials(login).get(); check(auth.success,"host signin");
 check(users.findByPrimaryKey(hostId).get().getValueOfLastModifiedByUserId()==hostId,"login audits last-active update");
 check(users.findByPrimaryKey(hostId).get().getValueOfCreatedByUserId()=="operator","login preserves creator");
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

 check(!token.has_payload_claim("permissions"),"JWT omits permission snapshot");
 Json::Value perms=auth.result["permissions"];
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
   .set_payload_claim("hostUserId",jwt::claim(hostId))
   .set_payload_claim("hostUserEmail",jwt::claim(std::string("h@example.com")))
   .set_payload_claim("hostUserName",jwt::claim(std::string("h")))
   .set_payload_claim("permissions",jwt::claim(permissions));
  if(expiration) b.set_expires_at(std::chrono::system_clock::now()+std::chrono::seconds(lifetime));
  return b.sign(jwt::algorithm::hs256{cfg["JwtSecurityKey"].asString()});
 };
 check(!accepts<HostJwtAuthFilter>(mint(-60,true,"test-audience","[]")),"expired token rejected");
 check(!accepts<HostJwtAuthFilter>(mint(3600,false,"test-audience","[]")),"missing expiration rejected");
 check(!accepts<HostJwtAuthFilter>(mint(3600,true,"wrong","[]")),"wrong audience rejected");
 check(accepts<HostJwtAuthFilter>(mint(3600,true,"test-audience","not-json")),"legacy malformed permission claim ignored");

 check(tt.get_payload_claim("tenantName").as_string()=="Acme","tenant name claim"); check(!tt.has_payload_claim("hostUserId"),"tenant has no host claims");
 check(!service.validateHostUserCredentials(login).get().success,"host rejects accountId");
 login.setAccountId("missing"); check(!service.validateTenantUserCredentials(login).get().success,"unknown tenant");
 login.setAccountId(""); check(!service.validateTenantUserCredentials(login).get().success,"tenant id required");
 tenant.setIsActive(false); tenants.update(tenant).get(); login.setAccountId("acme"); check(!service.validateTenantUserCredentials(login).get().success,"inactive tenant"); tenant.setIsActive(true); tenants.update(tenant).get();
 auto locked=users.findByPrimaryKey(tenantUserId).get(); locked.setIsLockedOut(true); users.update(locked).get();
 check(!service.validateTenantUserCredentials(login).get().success,"locked user rejected");
 locked.setIsLockedOut(false); locked.setIsActive(false); users.update(locked).get();
 check(!service.validateTenantUserCredentials(login).get().success,"inactive user rejected");
 check(service.getAllUsers(1,20,"tenant-a","").get().result["totalCount"].asUInt64()==1,"inactive non-deleted users remain visible");
 check(service.updateUser(update,tenantUserId,tenantIdentity).get().success,"inactive non-deleted user remains manageable");
 check(!service.createUser(input,tenantIdentity).get().success,"inactive live user still reserves identifier");
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
 check(!service.deleteUser(hostId,{"",hostId}).get().success,"self deletion rejected");
 auto deletedUser=service.deleteUser(tenantUserId,tenantIdentity).get();
 check(deletedUser.success && deletedUser.result["deleted"].asBool(),"soft delete reports deleted");
 auto deletedRow=users.findByPrimaryKey(tenantUserId).get();
 check(deletedRow.getValueOfIsDeleted(),"delete sets is_deleted");
 check(deletedRow.getValueOfDeletedByUserId()=="operator-a","delete stamps deleter");
 check(!deletedRow.toJson()["deleted_at"].isNull(),"delete stamps deletion time");
 check(deletedRow.getValueOfLastModifiedByUserId()=="operator-a","delete stamps modifier");
 check(deletedRow.getValueOfCreatedByUserId()=="operator-a","delete preserves creator");
 // Even an active, unlocked deleted row must be excluded by the deletion flag.
 deletedRow.setIsActive(true); deletedRow.setIsLockedOut(false); users.update(deletedRow).get();
 check(!service.validateTenantUserCredentials(login).get().success,"deleted user cannot login");
 check(service.getAllUsers(1,20,"tenant-a","").get().result["totalCount"].asUInt64()==0,"deleted users excluded from list and count");
 check(!service.updateUser(input,tenantUserId,tenantIdentity).get().success,"deleted user cannot be updated");
 check(!service.deleteUser(tenantUserId,tenantIdentity).get().success,"deleted user cannot be deleted twice");
 check(domain_services::PermissionService::getUserPermissions(tenantUserId).get().empty(),"deleted user grants no permissions");
 auto recreated=service.createUser(input,tenantIdentity).get();
 check(recreated.success,"deleted users excluded from create duplicate check");
 dto::UserDto different; different.setEmail("another@example.com"); different.setUsername("another"); different.setPassword("test-password");
 auto differentUser=service.createUser(different,tenantIdentity).get(); check(differentUser.success,"create user for update duplicate regression");
 // Remove the live replacement so only the deleted row reserves these identifiers.
 check(service.deleteUser(recreated.result["id"].asString(),tenantIdentity).get().success,"soft delete replacement");
 check(service.updateUser(input,differentUser.result["id"].asString(),tenantIdentity).get().success,"deleted users excluded from update duplicate check");
 check(!service.updateUserGroup(rename,groupId,host).get().success,"deleted group cannot be updated");
 check(!service.deleteUserGroup(groupId,host).get().success,"deleted group cannot be deleted twice");
 dto::UserGroupDto deletedParent; deletedParent.setTitle("Orphan"); deletedParent.setParentId(groupId);
 check(!service.createUserGroup(deletedParent,host).get().success,"deleted group cannot be used as parent");
 dto::UserGroupDto reused; reused.setTitle("Renamed operators");
 check(service.createUserGroup(reused,host).get().success,"deleted group excluded from create duplicate check");
 dto::UserGroupDto other; other.setTitle("Other group"); auto otherResponse=service.createUserGroup(other,host).get();
 check(otherResponse.success,"create another live group");
 dto::UserGroupDto useDeletedTitle; useDeletedTitle.setTitle("Child");
 check(service.updateUserGroup(useDeletedTitle,otherResponse.result["userGroupId"].asString(),host).get().success,"deleted group excluded from update duplicate check");

 cfg["JwtExpirationTime"]=0; login.setAccountId("");
 check(!service.validateHostUserCredentials(login).get().success,"invalid lifetime rejected");
 cfg["JwtExpirationTime"]=3600;
 // The first-install host user belongs to the protected host tenant, not NULL.
 Tenants hostTenant; hostTenant.setId(constants::kHostTenantId); hostTenant.setTenancyName("host"); hostTenant.setName("Host"); hostTenant.setIsActive(true); hostTenant.setIsDeleted(false); tenants.insert(hostTenant).get();
 Roles hostRole; hostRole.setId("bootstrap-role"); hostRole.setTenantId(constants::kHostTenantId); hostRole.setPermissions("[\"tenants.create\"]"); roles.insert(hostRole).get();
 Users bootstrap; bootstrap.setId("bootstrap-user"); bootstrap.setTenantId(constants::kHostTenantId); bootstrap.setUsername("admin"); bootstrap.setEmail("bootstrap@example.com"); bootstrap.setIsHostAdminUser(true); bootstrap.setIsTenantAdminUser(false); bootstrap.setIsActive(true); bootstrap.setIsLockedOut(false); bootstrap.setIsDeleted(false); bootstrap.setPasswordHash(bcrypt::generateHash("bootstrap-password",4)); bootstrap.setRoles("[\"bootstrap-role\"]"); users.insert(bootstrap).get();
 dto::SigninDto bootstrapLogin; bootstrapLogin.setUsernameOrEmail("bootstrap@example.com"); bootstrapLogin.setPassword("bootstrap-password");
 auto bootstrapAuth=service.validateHostUserCredentials(bootstrapLogin).get(); check(bootstrapAuth.success,"bootstrap host tenant user can sign in as host");
 auto bootstrapToken=jwt::decode(bootstrapAuth.result["token"].asString());
 check(bootstrapToken.get_payload_claim("hostUserId").as_string()=="bootstrap-user" && !bootstrapToken.has_payload_claim("tenantId"),"bootstrap token remains host scoped");
 check(accepts<HostJwtAuthFilter>(bootstrapAuth.result["token"].asString()),"bootstrap token passes host filter");
 check(bootstrapAuth.result["permissions"][0].asString()=="tenants.create","bootstrap host permission resolution");
 bootstrapLogin.setAccountId("host"); check(!service.validateTenantUserCredentials(bootstrapLogin).get().success,"host administrator cannot use tenant login"); bootstrapLogin.setAccountId("");
 hostTenant.setIsActive(false); tenants.update(hostTenant).get(); check(!service.validateHostUserCredentials(bootstrapLogin).get().success,"inactive host tenant blocks host login");
 hostTenant.setIsActive(true); hostTenant.setIsDeleted(true); tenants.update(hostTenant).get(); check(!service.validateHostUserCredentials(bootstrapLogin).get().success,"deleted host tenant blocks host login");
 cfg["JwtSecurityKey"]=""; login.setAccountId(""); check(!service.validateHostUserCredentials(login).get().success,"empty signing key rejected");
 checkRequestAuthorization();
 checkTotpLogin();
 std::cout<<checks<<" checks passed\n";
}
