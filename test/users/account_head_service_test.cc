#include "domain_services/gl/AccountHeadService.h"
#include "CoreAccountingUnits.h"
#include "GlAccountGroups.h"
#include "GlAccountControls.h"
#include "GlAccounts.h"
using namespace business_desk;
using namespace drogon_model::BusinessDesk;
using namespace drogon::orm;
extern void check(bool,const char*);
void checkAccountHeads() {
    CoroMapper<GlAccountGroups>::rows.clear();CoroMapper<CoreAccountingUnits>::rows.clear();
    CoroMapper<GlAccountControls>::rows.clear();CoroMapper<GlAccounts>::rows.clear();
    CoreAccountingUnits unit;unit.setId("unit-a");unit.setTenantId("tenant-a");unit.setIsActive(true);unit.setIsDeleted(false);unit.setName("HQ");unit.setCode("HQ");
    CoroMapper<CoreAccountingUnits> units(0);units.insert(unit).get();unit.setId("unit-b");unit.setTenantId("tenant-b");units.insert(unit).get();
    unit.setId("unit-a2");unit.setTenantId("tenant-a");units.insert(unit).get();
    utils::AuditIdentity actor{"tenant-a","user-a"};
    Json::Value input;input["name"]="Assets";input["accountType"]=0;input["isActive"]=true;input["parentId"]=Json::nullValue;
    auto run=[&](const std::string &op,std::string id="",std::string scope="unit-a",utils::AuditIdentity who={"tenant-a","user-a"},int page=1){return domain_services::AccountHeadService::execute(op,id,scope,input,page,1,"",who).get();};
    check(!run("create","","unit-a",{}).success,"anonymous heads rejected");
    auto list=run("units");check(list.success&&list.result.size()==2&&list.result[0]["id"].asString()=="unit-a","unit choices tenant scoped");
    check(!run("create","","unit-b").success,"foreign unit cannot be used");
    auto made=run("create");check(made.success,"create real account head");auto id=made.result["id"].asString();
    auto saved=CoroMapper<GlAccountGroups>(0).findByPrimaryKey(id).get();
    check(saved.getValueOfTenantId()==actor.tenantId&&saved.getValueOfAccountingUnitId()=="unit-a","head stamps tenant and unit");
    check(saved.getValueOfCreatedByUserId()==actor.userId,"create stamps authenticated actor");
    check(run("get",id).result["name"].asString()=="Assets","read single head");
    check(run("list").result["totalCount"].asInt()==1,"list live scoped heads");
    check(!run("get",id,"unit-b",{"tenant-b","b"}).success,"cross-tenant head read denied");
    check(!run("update",id,"unit-b",{"tenant-b","b"}).success,"cross-tenant head update denied");
    check(!run("delete",id,"unit-b",{"tenant-b","b"}).success,"cross-tenant head deletion denied");
    check(!run("get",id,"unit-a2").success && !run("update",id,"unit-a2").success && !run("delete",id,"unit-a2").success,"same tenant cannot access a head through another unit");
    input["parentId"]=id;check(!run("create","","unit-a2").success,"parent from a different accounting unit rejected");input["parentId"]=Json::nullValue;
    check(!run("create").success,"duplicate sibling rejected");
    input["name"]="Current assets";input["parentId"]=id;auto child=run("create");check(child.success,"create same-unit child");auto childId=child.result["id"].asString();
    check(!run("delete",id).success,"child prevents deleting parent");
    input["name"]="Assets";input["parentId"]=childId;check(!run("update",id).success,"cycle rejected");
    input["parentId"]=id;check(!run("update",id).success,"self parent rejected");
    input["parentId"]=Json::nullValue;input["accountType"]=1;check(!run("update",id).success,"dependent prevents type change");
    input["accountType"]=0;input["isActive"]=false;check(!run("update",id).success,"active child prevents deactivation");
    GlAccountControls control;control.setId("attached-control");control.setTenantId(actor.tenantId);control.setAccountingUnitId("unit-a");control.setAccountGroupId(childId);control.setIsDeleted(false);CoroMapper<GlAccountControls>(0).insert(control).get();
    check(!run("delete",childId).success,"live control prevents head deletion");control.setIsDeleted(true);CoroMapper<GlAccountControls>(0).update(control).get();
    GlAccounts account;account.setId("attached-account");account.setTenantId(actor.tenantId);account.setAccountingUnitId("unit-a");account.setAccountGroupId(childId);account.setIsDeleted(false);CoroMapper<GlAccounts>(0).insert(account).get();
    check(!run("delete",childId).success,"live account prevents head deletion");account.setIsDeleted(true);CoroMapper<GlAccounts>(0).update(account).get();
    check(run("delete",childId).success,"delete child succeeds when dependencies soft-deleted");
    input["name"]="Assets renamed";input["isActive"]=false;check(run("update",id).success,"persist inactive status");
    check(!run("get",id).result["isActive"].asBool(),"inactive persists on read");
    input["name"]="Bad child";input["parentId"]=id;check(!run("create").success,"inactive parent rejected");
    input["parentId"]=Json::nullValue;input["isActive"]=true;input["accountType"]=5;check(!run("create").success,"invalid account type rejected");
    input["accountType"]=0;input["isActive"]="false";check(!run("create").success,"string active flag rejected");
    input["isActive"]=true;input["name"]="   ";check(!run("create").success,"blank head rejected");input["name"]="Assets renamed";
    check(run("delete",id).success,"soft delete head");
    saved=CoroMapper<GlAccountGroups>(0).findByPrimaryKey(id).get();check(saved.getValueOfIsDeleted()&&saved.getValueOfDeletedByUserId()==actor.userId,"delete audit recorded");
    check(!run("get",id).success&&!run("update",id).success&&!run("delete",id).success,"deleted heads excluded from all operations");
    check(run("list").result["totalCount"].asInt()==0,"deleted heads excluded from list");
    check(run("create").success,"deleted sibling ignored by application duplicate check");
    CoroMapper<GlAccountGroups>::failQueries=true;auto failed=run("list");check(!failed.success&&failed.toJson().toStyledString().find("private-db-detail")==std::string::npos,"DB failure sanitized");CoroMapper<GlAccountGroups>::failQueries=false;
    drogon::TestTransaction::failCommit=true;input["name"]="Commit failure";check(!run("create").success,"commit failure cannot report successful save");drogon::TestTransaction::failCommit=false;
}
