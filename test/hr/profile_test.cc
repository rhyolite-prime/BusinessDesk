#include "domain_services/hr/HrProfileService.h"
#include "domain_services/permissions/PermissionService.h"
#include <algorithm>
#include <cctype>
#include <cassert>
#include <iostream>
#include <unordered_set>
using business_desk::domain_services::HrProfileService;
using business_desk::utils::AuditIdentity;
static std::unordered_set<std::string> grants;
namespace business_desk::domain_services {
drogon::Task<std::unordered_set<std::string>> PermissionService::getUserPermissions(const std::string &) { co_return grants; }
}
int main() {
  const std::string tenant="10000000-0000-4000-8000-000000000001", requester="20000000-0000-4000-8000-abcdefabcdef", reviewer="20000000-0000-4000-8000-000000000002", employee="30000000-0000-4000-8000-000000000001", id="40000000-0000-4000-8000-000000000001";
  bool admin=false, stale=false; int updates=0, events=0; std::string source="admin";
  drogon::app().getDbClient()->execute = [&](const std::string &sql,const std::vector<Json::Value> &args) -> drogon::TestResult {
    Json::Value row;
    if (sql.find("SELECT u.is_tenant_admin_user")!=std::string::npos) { row["is_tenant_admin_user"]=admin; return {{row}}; }
    if (sql.find("SELECT jsonb_build_object('id',e.id")!=std::string::npos) { assert(args[0].asString()==tenant && args[1].asString()==employee); assert(sql.find("date_of_birth")==std::string::npos && sql.find("health_issues")==std::string::npos); row["record"]="{\"id\":\""+employee+"\",\"version\":1}"; return {{row}}; }
    if (sql.find("INSERT INTO hr_profile_change_requests")!=std::string::npos) { assert(args[0].asString()==tenant && args[1].asString()==employee && args[4].asString()==requester); assert(sql.find("id=$2")!=std::string::npos); row["id"]=id; return {{row}}; }
    if (sql.find("SELECT employee_id,requested_by_user_id")!=std::string::npos) { row["employee_id"]=employee; row["requested_by_user_id"]=requester; row["employee_version"]=1; row["proposed"]="{\"personalEmail\":\"test@example.com\"}"; row["status"]="pending"; row["version"]=1; row["source"]=source; return {{row}}; }
    if (sql.find("UPDATE hr_employee_biodata")!=std::string::npos) { assert(args[0].asString()==tenant && args[2].asString()==source && args[3].asInt()==1 && args[6].asString()==requester); assert(sql.find("user_id=$7::uuid")!=std::string::npos); if(stale) return {}; ++updates; row["id"]=employee; return {{row}}; }
    if (sql.find("UPDATE hr_profile_change_requests")!=std::string::npos) return {};
    if (sql.find("INSERT INTO hr_profile_change_events")!=std::string::npos) { ++events; return {}; }
    assert(false); return {};
  };
  auto call=[&](std::string op,std::string key,Json::Value body,AuditIdentity who) { return HrProfileService::execute(op,key,body,"",who).get(); };
  AuditIdentity maker{tenant,requester}, approver{tenant,reviewer};
  assert(call("get",employee,{},maker).error["code"]=="forbidden");
  assert(call("list","",{},maker).error["code"]=="forbidden");
  assert(call("me","",{},maker).error["code"]=="validation_error");
  Json::Value b; b["employeeId"]=employee; b["employeeVersion"]=1; b["changes"]["personalEmail"]="test@example.com";
  assert(call("submit","",b,maker).error["code"]=="forbidden");
  grants={"hr.profile.read"}; assert(call("get",employee,{},maker).success); assert(call("submit","",b,maker).error["code"]=="forbidden");
  grants={"hr.profile.write"};
  Json::Value bad=b; bad["changes"]["medicalExpensesLimit"]="99";
  assert(call("submit","",bad,maker).error["code"]=="validation_error");
  bad=b; bad["changes"]["personalEmail"]="not-an-email";
  assert(call("submit","",bad,maker).error["code"]=="validation_error");
  bad=b; bad.removeMember("employeeId"); assert(call("submit","",bad,maker).error["code"]=="validation_error");
  assert(call("submit","",b,maker).success);
  Json::Value decision; decision["version"]=1; decision["note"]="";
  assert(call("approve",id,decision,approver).error["code"]=="forbidden");
  grants={"hr.profile.approve"};
  assert(call("approve",id,decision,maker).error["code"]=="forbidden");
  auto uppercase=requester; std::transform(uppercase.begin(),uppercase.end(),uppercase.begin(),[](unsigned char c){return std::toupper(c);});
  assert(call("approve",id,decision,{tenant,uppercase}).error["code"]=="forbidden");
  stale=true; assert(call("approve",id,decision,approver).error["code"]=="conflict" && updates==0 && events==0);
  stale=false; assert(call("approve",id,decision,approver).success && updates==1 && events==1);
  source="employee"; assert(call("approve",id,decision,approver).success && updates==2);
  assert(call("approve","bad",decision,approver).error["code"]=="validation_error");
  assert(HrProfileService::execute("get",employee,{},"",{}).get().error["code"]=="unauthorized");
  std::cout << "HR administrative profile permissions, validation and decisions passed\n";
}
