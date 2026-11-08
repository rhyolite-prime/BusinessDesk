#include "controllers/UserController.h"
#include "Users.h"
#include "constants/TenantConstants.h"
#include <bcrypt.h>
#include <unordered_set>

using namespace business_desk;
using namespace drogon;
using namespace drogon::orm;
using drogon_model::BusinessDesk::Users;
extern void check(bool, const char *);

namespace {
const std::string tenantA="10000000-0000-4000-8000-000000000001";
const std::string tenantB="20000000-0000-4000-8000-000000000001";
const std::string actor="90000000-0000-4000-8000-000000000001";
HttpRequestPtr request(bool host, std::unordered_set<std::string> permissions={"users.manage"}) {
    auto req=std::make_shared<HttpRequest>();
    req->attrs->insert(host?"hostUserId":"tenantUserId",actor);
    if(!host) req->attrs->insert("tenantId",tenantA);
    req->attrs->insert("permissions",permissions);
    return req;
}
Json::Value input(const std::string &email="user@example.com", const std::string &username="username") {
    Json::Value value; value["firstName"]="Jane"; value["lastName"]="Doe";
    value["email"]=email; value["username"]=username; value["password"]="test-password";
    return value;
}
void body(const HttpRequestPtr &req,Json::Value value) {req->json=std::make_shared<Json::Value>(std::move(value));}
}

void checkUserRoutes() {
    UserController controller;
    CoroMapper<Users> mapper(0);
    mapper.rows.clear();
    auto anonymous=std::make_shared<HttpRequest>();
    check(controller.listTenantUsers(anonymous).get()->status==401,"tenant users require identity");
    check(controller.listHostUsers(anonymous).get()->status==401,"host users require identity");
    auto noPermissions=request(false,{});
    check(controller.listTenantUsers(noPermissions).get()->status==403,"tenant listing requires permission");
    check(controller.createTenantUser(noPermissions).get()->status==403,"tenant create requires permission");
    check(controller.updateTenantUser(noPermissions,actor).get()->status==403,"tenant update requires permission");
    check(controller.deleteTenantUser(noPermissions,actor).get()->status==403,"tenant delete requires permission");
    auto hostNoPermissions=request(true,{});
    check(controller.listHostUsers(hostNoPermissions).get()->status==403,"host listing requires permission");
    check(controller.createHostUser(hostNoPermissions).get()->status==403,"host create requires permission");
    check(controller.updateHostUser(hostNoPermissions,actor).get()->status==403,"host update requires permission");
    check(controller.deleteHostUser(hostNoPermissions,actor).get()->status==403,"host delete requires permission");
    auto tenant=request(false), host=request(true);
    check(controller.listHostUsers(tenant).get()->status==401,"tenant identity cannot use host routes");
    check(controller.listTenantUsers(host).get()->status==401,"host identity cannot use tenant routes");
    auto mixed=request(true); mixed->attrs->insert("tenantId",tenantA);
    check(controller.listHostUsers(mixed).get()->status==403,"mixed host tenant identity rejected");
    auto missingTenant=request(false); missingTenant->attrs->data.erase("tenantId");
    check(controller.listTenantUsers(missingTenant).get()->status==401,"missing tenant cannot fall back to host scope");
    auto malformedTenant=request(false); malformedTenant->attrs->insert("tenantId",std::string("invalid"));
    check(controller.listTenantUsers(malformedTenant).get()->status==401,"malformed tenant identity rejected");
    anonymous->method=Options;
    check(controller.listTenantUsers(anonymous).get()->status==204,"tenant OPTIONS without auth");
    check(controller.createHostUser(anonymous).get()->status==204,"host OPTIONS without auth");

    check(controller.createTenantUser(tenant).get()->status==400,"missing body rejected");
    body(tenant,Json::arrayValue); check(controller.createTenantUser(tenant).get()->status==400,"array body rejected");
    body(tenant,Json::objectValue); check(controller.createTenantUser(tenant).get()->status==400,"empty body rejected");
    auto value=input(); value["email"]=12; body(tenant,value);
    check(controller.createTenantUser(tenant).get()->status==400,"wrong field type rejected");
    value=input(); value["password"]=Json::nullValue; body(tenant,value);
    check(controller.createTenantUser(tenant).get()->status==400,"null password rejected");
    value=input(); value.removeMember("password"); body(tenant,value);
    check(controller.createTenantUser(tenant).get()->status==400,"missing initial password rejected");
    value=input(); value["email"]="bad-email"; body(tenant,value);
    check(controller.createTenantUser(tenant).get()->status==400,"email shape validation");
    value=input(); value["password"]="short"; body(tenant,value);
    check(controller.createTenantUser(tenant).get()->status==400,"short password rejected");
    value=input(); value["password"]=std::string(73,'x'); body(tenant,value);
    check(controller.createTenantUser(tenant).get()->status==400,"bcrypt truncation prevented");
    value=input(); value["firstName"]=std::string(101,'x'); body(tenant,value);
    check(controller.createTenantUser(tenant).get()->status==400,"field length validation");
    for(const auto *field:{"tenantId","isHostAdminUser","isTenantAdminUser","roles","isDeleted","createdByUserId"}) {
        value=input(); value[field]="forged"; body(tenant,value);
        check(controller.createTenantUser(tenant).get()->status==400,"tenant cannot mass assign scope or privilege");
        body(host,value); check(controller.createHostUser(host).get()->status==400,"host cannot mass assign scope or privilege");
    }
    tenant->parameters["tenantId"]=tenantB;
    check(controller.listTenantUsers(tenant).get()->status==400,"tenant query override rejected"); tenant->parameters.clear();
    host->parameters["tenantId"]=tenantA;
    check(controller.listHostUsers(host).get()->status==400,"host cannot choose tenant scope"); host->parameters.clear();
    tenant->parameters["pageNo"]="0"; check(controller.listTenantUsers(tenant).get()->status==400,"page zero rejected");
    tenant->parameters["pageNo"]="999999999999999999999"; check(controller.listTenantUsers(tenant).get()->status==400,"page overflow rejected");
    tenant->parameters["pageNo"]="1junk"; check(controller.listTenantUsers(tenant).get()->status==400,"partial page parse rejected");
    tenant->parameters.clear(); tenant->parameters["pageSize"]="-1"; check(controller.listTenantUsers(tenant).get()->status==400,"negative page size rejected"); tenant->parameters.clear();

    body(tenant,input("JANE@example.com","JANE"));
    auto created=controller.createTenantUser(tenant).get();
    check(created->status==201 && created->body["success"].asBool(),"tenant create response");
    check(created->headers["Cache-Control"]=="no-store","user responses disable caching");
    const auto tenantUserId=created->body["result"]["id"].asString();
    auto user=mapper.findByPrimaryKey(tenantUserId).get();
    check(user.getValueOfTenantId()==tenantA && !user.getValueOfIsHostAdminUser(),"tenant creation derives scope");
    check(user.getValueOfEmail()=="jane@example.com" && user.getValueOfUsername()=="jane","identifiers normalized");
    check(bcrypt::validatePassword("test-password",user.getValueOfPasswordHash()),"controller forwards password for bcrypt");
    check(user.getValueOfCreatedByUserId()==actor,"controller forwards audit actor");
    check(!created->body["result"].isMember("password") && !created->body["result"].isMember("password_hash"),"create does not expose secrets");
    check(controller.createTenantUser(tenant).get()->status==409,"live duplicate maps conflict");

    // Identical identifiers in another tenant are allowed, but never displayed or mutated here.
    auto foreign=user; foreign.setId("30000000-0000-4000-8000-000000000001"); foreign.setTenantId(tenantB); mapper.insert(foreign).get();
    auto listed=controller.listTenantUsers(tenant).get();
    check(listed->body["result"]["totalCount"].asUInt64()==1,"tenant list and count isolated");
    const auto listedUser=listed->body["result"]["data"][0];
    check(listedUser["username"].asString()=="jane" && !listedUser.isMember("passwordHash") && !listedUser.isMember("password_hash"),"safe list projection includes username");
    tenant->parameters["query"]="jane"; check(controller.listTenantUsers(tenant).get()->body["result"]["totalCount"].asUInt64()==1,"username search"); tenant->parameters.clear();
    tenant->parameters["pageSize"]="999"; check(controller.listTenantUsers(tenant).get()->body["result"]["pageSize"].asInt()==200,"page size capped"); tenant->parameters.clear();
    Json::Value edit; edit["firstName"]="Changed"; body(tenant,edit);
    check(controller.updateTenantUser(tenant,foreign.getValueOfId()).get()->status==404,"cross-tenant update is not found");
    check(controller.deleteTenantUser(tenant,foreign.getValueOfId()).get()->status==404,"cross-tenant deletion is not found");
    check(controller.updateTenantUser(tenant,"not-a-uuid").get()->status==400,"invalid update id");
    check(controller.deleteTenantUser(tenant,"not-a-uuid").get()->status==400,"invalid delete id");
    const auto oldHash=user.getValueOfPasswordHash();
    check(controller.updateTenantUser(tenant,tenantUserId).get()->status==200,"tenant partial update");
    user=mapper.findByPrimaryKey(tenantUserId).get();
    check(user.getValueOfFirstName()=="Changed" && user.getValueOfPasswordHash()==oldHash,"partial update preserves omitted password");
    check(user.getValueOfCreatedByUserId()==actor && user.getValueOfLastModifiedByUserId()==actor,"update preserves creation audit");
    Json::Value newPassword; newPassword["password"]="replacement-password"; body(tenant,newPassword);
    check(controller.updateTenantUser(tenant,tenantUserId).get()->status==200,"password update");
    check(bcrypt::validatePassword("replacement-password",mapper.findByPrimaryKey(tenantUserId).get().getValueOfPasswordHash()),"updated password hashed");
    check(controller.deleteTenantUser(tenant,actor).get()->status==400,"self-deletion rejected");
    check(controller.deleteTenantUser(tenant,tenantUserId).get()->status==200,"tenant soft delete");
    user=mapper.findByPrimaryKey(tenantUserId).get();
    check(user.getValueOfIsDeleted() && user.getValueOfDeletedByUserId()==actor,"tenant deletion audited");
    check(controller.listTenantUsers(tenant).get()->body["result"]["totalCount"].asUInt64()==0,"deleted tenant users excluded");
    check(controller.updateTenantUser(tenant,tenantUserId).get()->status==404,"deleted user cannot be edited");
    check(controller.deleteTenantUser(tenant,tenantUserId).get()->status==404,"repeated delete returns not found");

    body(host,input("host@example.com","hostuser"));
    auto hostCreated=controller.createHostUser(host).get(); check(hostCreated->status==201,"host create");
    const auto hostId=hostCreated->body["result"]["id"].asString();
    auto hostUser=mapper.findByPrimaryKey(hostId).get();
    check(hostUser.getValueOfTenantId().empty() && hostUser.getValueOfIsHostAdminUser(),"host creation derives host scope");
    check(hostUser.getValueOfCreatedByUserId()==actor,"host creation audited");
    auto bootstrap=hostUser; bootstrap.setId("40000000-0000-4000-8000-000000000001"); bootstrap.setTenantId(constants::kHostTenantId); bootstrap.setEmail("bootstrap@example.com"); bootstrap.setUsername("bootstrap"); mapper.insert(bootstrap).get();
    auto hostList=controller.listHostUsers(host).get();
    check(hostList->body["result"]["totalCount"].asUInt64()==2,"host list includes bootstrap and legacy hosts only");
    body(host,edit); check(controller.updateHostUser(host,hostId).get()->status==200,"host update");
    check(controller.updateHostUser(host,foreign.getValueOfId()).get()->status==404,"host route cannot edit tenant users");
    check(controller.deleteHostUser(host,foreign.getValueOfId()).get()->status==404,"host route cannot delete tenant users");
    check(controller.deleteTenantUser(tenant,hostId).get()->status==404,"tenant route cannot delete host users");
    check(controller.deleteHostUser(host,hostId).get()->status==200,"host soft delete");
    check(mapper.findByPrimaryKey(hostId).get().getValueOfIsDeleted(),"host deleted flag");
    check(controller.updateHostUser(host,hostId).get()->status==404,"deleted host cannot be edited");
    check(controller.deleteHostUser(host,hostId).get()->status==404,"deleted host cannot be deleted again");

    auto readOnly=request(false,{"user_management.users.view"});
    check(controller.listTenantUsers(readOnly).get()->status==200,"configured tenant read permission");
    body(readOnly,input()); check(controller.createTenantUser(readOnly).get()->status==403,"read cannot create");
    auto editOnly=request(true,{"users.edit"}); body(editOnly,edit);
    check(controller.updateHostUser(editOnly,bootstrap.getValueOfId()).get()->status==200,"configured host edit permission");
    check(controller.listHostUsers(editOnly).get()->status==403,"edit cannot list without read");
    auto tenantManage=request(false,{"user_management.manage"});
    check(controller.listTenantUsers(tenantManage).get()->status==200,"configured tenant manage permission");
    mapper.failQueries=true;
    auto failed=controller.listTenantUsers(tenant).get(); check(failed->status==500,"database errors map server error");
    check(!failed->body["error"].isMember("detail") && failed->body.toStyledString().find("private-db-detail")==std::string::npos,"DB details stripped");
    mapper.failQueries=false; mapper.failUniqueWrites=true;
    body(tenant,input("unique-race@example.com","unique-race"));
    check(controller.createTenantUser(tenant).get()->status==409,"concurrent insert uniqueness maps conflict");
    body(host,edit); check(controller.updateHostUser(host,bootstrap.getValueOfId()).get()->status==409,"concurrent update uniqueness maps conflict");
    mapper.failUniqueWrites=false;
    mapper.rows.clear();
}
