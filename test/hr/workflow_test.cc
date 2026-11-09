#include "domain_services/hr/HrWorkflowService.h"
#include "domain_services/permissions/PermissionService.h"
#include <cassert>
#include <iostream>
#include <unordered_set>
using business_desk::domain_services::HrWorkflowService;
using business_desk::utils::AuditIdentity;
static std::unordered_set<std::string> grants;
namespace business_desk::domain_services {
drogon::Task<std::unordered_set<std::string>> PermissionService::getUserPermissions(const std::string &) { co_return grants; }
}
int main() {
  const std::string tenant = "10000000-0000-4000-8000-000000000001", user = "20000000-0000-4000-8000-000000000001", employee = "30000000-0000-4000-8000-000000000001", id = "40000000-0000-4000-8000-000000000001";
  AuditIdentity who{tenant,user}; bool changed = false;
  drogon::app().getDbClient()->execute = [&](const std::string &sql, const std::vector<Json::Value> &args) -> drogon::TestResult {
    Json::Value row;
    if (sql.find("SELECT u.is_tenant_admin_user") != std::string::npos) { row["is_tenant_admin_user"] = false; return {{row}}; }
    if (sql.find("SELECT count(*) AS total") != std::string::npos) { row["total"] = 0; return {{row}}; }
    if (sql.find("SELECT jsonb_build_object") != std::string::npos) { assert(args[0].asString()==tenant); return {}; }
    if (sql.find("INSERT INTO hr_people_work_items") != std::string::npos) { assert(args[0].asString()==tenant && args[2].asString()==employee); row["id"] = id; return {{row}}; }
    if (sql.find("UPDATE hr_people_work_items SET status") != std::string::npos) { assert(args[0].asString()==tenant && sql.find("status IN ('open')") != std::string::npos); if (changed) return {}; changed = true; row["id"] = id; return {{row}}; }
    assert(false); return {};
  };
  auto call = [&](std::string kind,std::string op,std::string key,Json::Value body) { return HrWorkflowService::execute(kind,op,key,body,"",who).get(); };
  Json::Value b; b["title"]="Orientation"; b["personName"]=""; b["email"]=""; b["employeeId"]=employee; b["dueDate"]="2028-02-29"; b["notes"]="";
  assert(call("onboarding","create","",b).error["code"]=="forbidden");
  grants={"hr.read"}; assert(call("onboarding","list","",{}).success); assert(call("onboarding","create","",b).error["code"]=="forbidden");
  grants={"hr.write"}; Json::Value bad=b; bad["dueDate"]="2027-02-29"; assert(call("onboarding","create","",bad).error["code"]=="validation_error");
  bad=b; bad["tenantId"]=tenant; assert(call("onboarding","create","",bad).error["code"]=="validation_error");
  bad=b; bad["employeeId"]=""; assert(call("onboarding","create","",bad).error["code"]=="validation_error");
  assert(call("onboarding","create","",b).success);
  Json::Value decision; decision["version"]=1; decision["status"]="hired"; assert(call("onboarding","transition",id,decision).error["code"]=="validation_error");
  decision["status"]="completed"; assert(call("onboarding","transition",id,decision).success); assert(call("onboarding","transition",id,decision).error["code"]=="conflict");
  assert(call("unknown","list","",{}).error["code"]=="validation_error");
  std::cout << "HR workflow validation, permissions and lifecycle seam tests passed\n";
}
