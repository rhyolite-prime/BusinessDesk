#include "domain_services/gl/AccountControlService.h"
#include "CoreAccountingUnits.h"
#include "GlAccountGroups.h"
#include "GlAccountControls.h"
#include "GlAccounts.h"
using namespace business_desk;
using namespace drogon_model::BusinessDesk;
using namespace drogon::orm;
extern void check(bool,const char*);
void checkAccountControls() {
    CoroMapper<CoreAccountingUnits>::rows.clear();CoroMapper<GlAccountGroups>::rows.clear();CoroMapper<GlAccountControls>::rows.clear();CoroMapper<GlAccounts>::rows.clear();
    const std::string unitId="a0000000-0000-4000-8000-000000000001",unit2="a0000000-0000-4000-8000-000000000002",foreign="a0000000-0000-4000-8000-000000000003";
    const std::string groupId="b0000000-0000-4000-8000-000000000001",group2="b0000000-0000-4000-8000-000000000002";
    CoreAccountingUnits unit;unit.setId(unitId);unit.setTenantId("tenant-a");unit.setIsActive(true);unit.setIsDeleted(false);CoroMapper<CoreAccountingUnits>(0).insert(unit).get();
    unit.setId(unit2);CoroMapper<CoreAccountingUnits>(0).insert(unit).get();unit.setId(foreign);unit.setTenantId("tenant-b");CoroMapper<CoreAccountingUnits>(0).insert(unit).get();
    GlAccountGroups head;head.setId(groupId);head.setTenantId("tenant-a");head.setAccountingUnitId(unitId);head.setIsActive(true);head.setIsDeleted(false);CoroMapper<GlAccountGroups>(0).insert(head).get();head.setId(group2);CoroMapper<GlAccountGroups>(0).insert(head).get();
    Json::Value input;input["accountGroupId"]=groupId;input["accountHeaderName"]=" Cash and bank ";input["parentAccountHeaderId"]=Json::nullValue;input["minAccount"]=1000;input["maxAccount"]=1999;input["isActive"]=true;
    auto run=[&](std::string op,std::string id="",std::string scope="a0000000-0000-4000-8000-000000000001",utils::AuditIdentity who={"tenant-a","user-a"},int page=1,std::string query=""){return domain_services::AccountControlService::execute(op,id,scope,input,page,1,query,who).get();};
    check(!run("list","",unitId,{}).success,"anonymous controls rejected");
    check(!run("list","",foreign).success,"foreign unit inaccessible");
    check(!run("list","","invalid").success,"invalid unit UUID rejected");
    check(!run("get","invalid").success,"invalid control UUID rejected");
    auto made=run("create");check(made.success&&made.result["accountHeaderName"].asString()=="Cash and bank","create trimmed real control");auto id=made.result["id"].asString();
    auto saved=CoroMapper<GlAccountControls>(0).findByPrimaryKey(id).get();
    check(saved.getValueOfTenantId()=="tenant-a"&&saved.getValueOfAccountingUnitId()==unitId&&saved.getValueOfCreatedByUserId()=="user-a","control create audit and scope");
    check(run("get",id).success,"get saved control");
    check(run("list").result["totalCount"].asInt()==1,"live scoped control list");
    check(run("list","",unitId,{"tenant-a","user-a"},1,"missing").result["totalCount"].asInt()==0,"server control search");
    for(auto op:{"get","update","delete"}) {
        check(!run(op,id,foreign,{"tenant-b","user-b"}).success,"cross tenant control operation rejected");
        check(!run(op,id,unit2).success,"same tenant different unit operation rejected");
    }
    check(!run("create").success,"duplicate sibling name rejected");
    input["accountHeaderName"]="Overlap";input["minAccount"]=1500;input["maxAccount"]=2500;check(!run("create").success,"overlapping sibling range rejected");
    input["accountHeaderName"]="Child";input["parentAccountHeaderId"]=id;input["minAccount"]=1100;input["maxAccount"]=1199;
    auto child=run("create");check(child.success,"same-head child control created");auto childId=child.result["id"].asString();
    check(!run("delete",id).success,"child blocks control deletion");
    input["parentAccountHeaderId"]=childId;check(!run("update",id).success,"control cycle rejected");
    input["parentAccountHeaderId"]=id;check(!run("update",id).success,"self parent rejected");
    input["accountGroupId"]=group2;check(!run("create").success,"parent from different head rejected");input["accountGroupId"]=groupId;
    input["maxAccount"]=2100;check(!run("create").success,"child must fit parent range");input["maxAccount"]=1199;
    input["parentAccountHeaderId"]=Json::nullValue;input["accountHeaderName"]="Root";input["minAccount"]=1200;input["maxAccount"]=1999;check(!run("update",id).success,"cannot shrink around child range");
    input["minAccount"]=1000;input["isActive"]=false;check(!run("update",id).success,"active child prevents control deactivation");input["isActive"]=true;
    input["accountGroupId"]=group2;check(!run("update",id).success,"control with children cannot move head");input["accountGroupId"]=groupId;
    input["accountHeaderName"]="Child renamed";input["parentAccountHeaderId"]=id;input["minAccount"]=1100;input["maxAccount"]=1199;check(run("update",childId).success,"child edit persists");
    check(run("get",childId).result["accountHeaderName"].asString()=="Child renamed","read persisted edit");
    saved=CoroMapper<GlAccountControls>(0).findByPrimaryKey(childId).get();check(saved.getValueOfLastModifiedByUserId()=="user-a","control update audit actor");
    GlAccounts account;account.setId("linked-account");account.setTenantId("tenant-a");account.setAccountingUnitId(unitId);account.setAccountHeaderId(childId);account.setAccountNumber("1150");account.setStatus("active");account.setIsDeleted(false);CoroMapper<GlAccounts>(0).insert(account).get();
    check(!run("delete",childId).success,"live ledger account blocks deletion");
    input["minAccount"]=1160;check(!run("update",childId).success,"range cannot exclude linked account number");input["minAccount"]=1100;
    input["isActive"]=false;check(!run("update",childId).success,"active linked account prevents deactivation");input["isActive"]=true;
    input["parentAccountHeaderId"]=Json::nullValue;input["accountGroupId"]=group2;check(!run("update",childId).success,"linked account prevents head move");input["accountGroupId"]=groupId;
    input["parentAccountHeaderId"]=childId;input["minAccount"]=1110;input["maxAccount"]=1120;check(!run("create").success,"populated leaf cannot gain child controls");
    account.setIsDeleted(true);CoroMapper<GlAccounts>(0).update(account).get();check(run("delete",childId).success,"deleted accounts do not block deletion");
    saved=CoroMapper<GlAccountControls>(0).findByPrimaryKey(childId).get();check(saved.getValueOfIsDeleted()&&!saved.getValueOfIsActive()&&saved.getValueOfDeletedByUserId()=="user-a","control soft deletion audited");
    for(auto op:{"get","update","delete"})check(!run(op,childId).success,"deleted control excluded from mutations and reads");
    input["parentAccountHeaderId"]=Json::nullValue;input["accountHeaderName"]="Root renamed";input["minAccount"]=1000;input["maxAccount"]=1999;input["isActive"]=false;
    check(run("update",id).success,"deactivate after live dependencies removed");
    input["parentAccountHeaderId"]=id;input["isActive"]=true;check(!run("create").success,"inactive parent rejected");input["parentAccountHeaderId"]=Json::nullValue;
    input["minAccount"]=-1;check(!run("update",id).success,"negative range rejected");input["minAccount"]=1000;
    input["maxAccount"]=Json::Int64(2147483648LL);check(!run("update",id).success,"int32 overflow rejected");input["maxAccount"]=1999;
    input["minAccount"]=1000.5;check(!run("update",id).success,"fractional range rejected");input["minAccount"]=1000;
    input["isActive"]="false";check(!run("update",id).success,"string control status rejected");input["isActive"]=true;
    input["tenantId"]="forged";check(!run("update",id).success,"forged audit or scope fields rejected");input.removeMember("tenantId");
    input["accountHeaderName"]="   ";check(!run("update",id).success,"blank control name rejected");input["accountHeaderName"]="Root renamed";
    head=CoroMapper<GlAccountGroups>(0).findByPrimaryKey(groupId).get();head.setIsDeleted(true);CoroMapper<GlAccountGroups>(0).update(head).get();check(!run("update",id).success,"deleted head cannot be used");head.setIsDeleted(false);head.setIsActive(false);CoroMapper<GlAccountGroups>(0).update(head).get();check(!run("update",id).success,"inactive head rejected");head.setIsActive(true);CoroMapper<GlAccountGroups>(0).update(head).get();
    drogon::TestTransaction::failCommit=true;check(!run("update",id).success,"failed control commit never reports success");drogon::TestTransaction::failCommit=false;
    CoroMapper<GlAccountControls>::failUniqueWrites=true;check(run("update",id).error["code"].asString()=="conflict","unique constraint mapped to conflict");CoroMapper<GlAccountControls>::failUniqueWrites=false;
    CoroMapper<GlAccountControls>::failQueries=true;auto failed=run("list");check(!failed.success&&failed.toJson().toStyledString().find("private-db-detail")==std::string::npos,"control database failure sanitized");CoroMapper<GlAccountControls>::failQueries=false;
    check(run("delete",id).success,"delete root after soft deleting child");check(run("list").result["totalCount"].asInt()==0,"deleted controls absent from list");
    unit=CoroMapper<CoreAccountingUnits>(0).findByPrimaryKey(unitId).get();unit.setIsDeleted(true);CoroMapper<CoreAccountingUnits>(0).update(unit).get();check(!run("list").success,"deleted accounting unit rejected");
}
