// Service-level tests using the repository's synchronous Drogon seam.
#include "domain_services/hr/HrService.h"
#include "domain_services/permissions/PermissionService.h"
#include <cassert>
#include <iostream>
#include <unordered_set>
using business_desk::domain_services::HrService;
using business_desk::domain_services::PermissionService;
using business_desk::utils::AuditIdentity;
static std::unordered_set<std::string> permissions;
namespace business_desk::domain_services {
drogon::Task<std::unordered_set<std::string>> PermissionService::getUserPermissions(const std::string &) { co_return permissions; }
}
int main() {
  const std::string tenant = "10000000-0000-4000-8000-000000000001", actor = "20000000-0000-4000-8000-000000000001", employee = "30000000-0000-4000-8000-000000000001", id = "40000000-0000-4000-8000-000000000001";
  AuditIdentity who{tenant, actor};
  bool admin = false, inserted = false, changed = false;
  auto db = drogon::app().getDbClient();
  db->execute = [&](const std::string &sql, const std::vector<Json::Value> &args) -> drogon::TestResult {
    Json::Value row;
    if (sql.find("SELECT u.is_tenant_admin_user") != std::string::npos) { row["is_tenant_admin_user"] = admin; return {{row}}; }
    if (sql.find("INSERT INTO hr_leave_requests") != std::string::npos) { assert(args[0].asString() == tenant && args[1].asString() == employee); assert(sql.find("is_deleted=false FOR SHARE") != std::string::npos); inserted = true; row["id"] = id; return {{row}}; }
    if (sql.find("UPDATE hr_leave_requests") != std::string::npos) { assert(args[0].asString() == tenant && args[1].asString() == id); assert(sql.find("status='pending' AND version=$6") != std::string::npos); if (changed) return {}; changed = true; row["id"] = id; return {{row}}; }
    if (sql.find("count(*) AS total") != std::string::npos) { row["total"] = 1; row["pending"] = 1; row["away"] = 0; return {{row}}; }
    if (sql.find("jsonb_build_object") != std::string::npos) return {};
    assert(false); return {};
  };
  auto call = [&](std::string op, std::string key = "", Json::Value body = Json::Value(), AuditIdentity identity = {}) { if (identity.tenantId.empty()) identity = who; return HrService::execute(op, key, body, "", identity).get(); };
  Json::Value body; body["employeeId"] = employee; body["leaveType"] = "annual"; body["startDate"] = "2028-02-29"; body["endDate"] = "2028-03-01"; body["reason"] = "";
  assert(call("create", "", body).error["code"] == "forbidden");
  permissions = {"hr.read"};
  assert(call("list").success && !call("list").result["canWrite"].asBool());
  assert(call("create", "", body).error["code"] == "forbidden");
  permissions = {"hr.write"};
  Json::Value invalid = body; invalid["startDate"] = "2027-02-29";
  assert(call("create", "", invalid).error["code"] == "validation_error");
  invalid = body; invalid["endDate"] = "2028-02-28";
  assert(call("create", "", invalid).error["code"] == "validation_error");
  invalid = body; invalid["tenantId"] = tenant;
  assert(call("create", "", invalid).error["code"] == "validation_error");
  assert(call("create", "", body).success && inserted);
  Json::Value decision; decision["version"] = 1; decision["note"] = "";
  assert(call("approve", id, decision).success);
  assert(call("reject", id, decision).error["code"] == "conflict");
  assert(call("approve", "bad", decision).error["code"] == "validation_error");
  assert(HrService::execute("list", "", {}, "-1", who).get().error["code"] == "validation_error");
  assert(HrService::execute("list", "", {}, "", {}).get().error["code"] == "unauthorized");
  std::cout << "HR service validation, authorization and lifecycle seam tests passed\n";
}
