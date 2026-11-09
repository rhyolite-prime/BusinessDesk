#include "HrService.h"
#include "constants/TenantConstants.h"
#include "domain_services/permissions/PermissionService.h"
#include <chrono>
#include <regex>
#include <set>

namespace business_desk::domain_services {
namespace {
dto::BaseApiResponse fail(const char *code, const char *message) {
  dto::BaseApiResponse r; r.error["code"] = code; r.error["message"] = message; return r;
}
bool uuid(const std::string &s) {
  static const std::regex re("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");
  return std::regex_match(s, re) && s != "00000000-0000-0000-0000-000000000000";
}
bool date(const std::string &s) {
  if (!std::regex_match(s, std::regex(R"(^[12][0-9]{3}-[0-9]{2}-[0-9]{2}$)"))) return false;
  auto y = std::stoi(s.substr(0,4));
  return y >= 1900 && std::chrono::year_month_day{std::chrono::year{y}, std::chrono::month{unsigned(std::stoi(s.substr(5,2)))}, std::chrono::day{unsigned(std::stoi(s.substr(8,2)))}}.ok();
}
bool bounded(const Json::Value &v, unsigned max) {
  if (!v.isString()) return false;
  const auto s = v.asString();
  return s.size() <= max && s.find('\0') == std::string::npos;
}
bool fieldsOnly(const Json::Value &v, const std::set<std::string> &allowed) {
  if (!v.isObject()) return false;
  for (const auto &key : v.getMemberNames()) if (!allowed.count(key)) return false;
  return true;
}
Json::Value parse(const std::string &s) { Json::Value v; Json::Reader reader; if (!reader.parse(s,v)) throw std::runtime_error("Invalid database JSON"); return v; }
}
drogon::Task<dto::BaseApiResponse> HrService::execute(std::string op, std::string id, Json::Value body, std::string page, utils::AuditIdentity who) {
  if (!uuid(who.tenantId) || !uuid(who.userId) || who.tenantId == constants::kHostTenantId)
    co_return fail("unauthorized", "Tenant sign-in required.");
  const bool write = op != "list" && op != "balance";
  if (op != "list" && op != "balance" && op != "create" && op != "approve" && op != "reject" && op != "cancel")
    co_return fail("validation_error", "Unknown operation.");
  int p = 1;
  if (!page.empty()) {
    try { size_t end = 0; p = std::stoi(page, &end); if (end != page.size() || p < 1 || p > 1000000) throw std::invalid_argument("page"); }
    catch (...) { co_return fail("validation_error", "Invalid page."); }
  }
  if (op == "balance" && (!uuid(id) || p < 1900 || p > 2999))
    co_return fail("validation_error", "A valid employee ID and calendar year are required.");
  if (op == "create") {
    if (!fieldsOnly(body, {"employeeId","leaveType","startDate","endDate","reason"}) ||
        !body["employeeId"].isString() || !uuid(body["employeeId"].asString()) ||
        !body["leaveType"].isString() || !std::set<std::string>{"annual","sick","unpaid","other"}.count(body["leaveType"].asString()) ||
        !body["startDate"].isString() || !body["endDate"].isString() || !date(body["startDate"].asString()) || !date(body["endDate"].asString()) || body["endDate"].asString() < body["startDate"].asString() ||
        !bounded(body["reason"],500))
      co_return fail("validation_error", "Provide a valid employee, leave type, date range and reason (up to 500 bytes).");
  } else if (write) {
    if (!uuid(id) || !fieldsOnly(body, {"version","note"}) || !body["version"].isInt() || body["version"].asInt() < 1 || body["version"].asInt() == 2147483647 || !bounded(body["note"],500))
      co_return fail("validation_error", "A valid ID, version and note (up to 500 bytes) are required.");
  }
  try {
    auto db = drogon::app().getDbClient();
    auto actor = co_await db->execSqlCoro("SELECT u.is_tenant_admin_user FROM users u JOIN tenants t ON t.id=u.tenant_id AND t.is_active=true AND t.is_deleted=false WHERE u.id=$1 AND u.tenant_id=$2 AND u.is_active=true AND u.is_deleted=false AND u.is_locked_out=false AND u.is_host_admin_user=false", who.userId, who.tenantId);
    if (actor.empty()) co_return fail("forbidden", "A live tenant user is required.");
    bool canWrite = actor[0]["is_tenant_admin_user"].as<bool>();
    bool canRead = canWrite;
    if (!canWrite) {
      auto grants = co_await PermissionService::getUserPermissions(who.userId);
      canWrite = grants.count("*") || grants.count("hr.manage") || grants.count("hr.write");
      canRead = canWrite || grants.count("hr.read");
    }
    if ((write && !canWrite) || (!write && !canRead)) co_return fail("forbidden", "HR permission or tenant administrator access required.");
    dto::BaseApiResponse r;
    if (op == "list") {
      auto counts = co_await db->execSqlCoro("SELECT count(*) AS total, count(*) FILTER (WHERE status='pending') AS pending, count(DISTINCT employee_id) FILTER (WHERE status='approved' AND current_date BETWEEN start_date AND end_date) AS away FROM hr_leave_requests WHERE tenant_id=$1", who.tenantId);
      auto rows = co_await db->execSqlCoro("SELECT jsonb_build_object('id',l.id,'employeeId',l.employee_id,'employeeName',concat_ws(' ',e.first_name,NULLIF(e.other_name,''),e.last_name),'employeeIdentifier',e.employee_identifier,'leaveType',l.leave_type,'startDate',l.start_date,'endDate',l.end_date,'reason',l.reason,'status',l.status,'decisionNote',l.decision_note,'createdAt',l.created_at,'decidedAt',l.decided_at,'version',l.version)::text AS record FROM hr_leave_requests l JOIN hr_employee_biodata e ON e.tenant_id=l.tenant_id AND e.id=l.employee_id WHERE l.tenant_id=$1 ORDER BY l.created_at DESC,l.id DESC LIMIT 20 OFFSET $2", who.tenantId, (int64_t(p)-1)*20);
      r.result["data"] = Json::arrayValue;
      for (const auto &row : rows) r.result["data"].append(parse(row["record"].as<std::string>()));
      r.result["totalCount"] = Json::Int64(counts[0]["total"].as<int64_t>());
      r.result["pendingCount"] = Json::Int64(counts[0]["pending"].as<int64_t>());
      r.result["awayCount"] = Json::Int64(counts[0]["away"].as<int64_t>());
      r.result["canWrite"] = canWrite;
    } else if (op == "balance") {
      auto rows = co_await db->execSqlCoro("SELECT e.leave_days_entitled AS entitlement, coalesce(sum(least(l.end_date,make_date($3,12,31))-greatest(l.start_date,make_date($3,1,1))+1),0)::bigint AS used FROM hr_employee_biodata e LEFT JOIN hr_leave_requests l ON l.tenant_id=e.tenant_id AND l.employee_id=e.id AND l.status='approved' AND l.leave_type='annual' AND l.start_date<=make_date($3,12,31) AND l.end_date>=make_date($3,1,1) WHERE e.tenant_id=$1 AND e.id=$2 AND e.is_deleted=false GROUP BY e.id,e.leave_days_entitled",who.tenantId,id,p);
      if (rows.empty()) co_return fail("not_found", "Employee not found in this tenant.");
      const auto entitlement = rows[0]["entitlement"].as<int>();
      const auto used = rows[0]["used"].as<int64_t>();
      r.result["year"] = p; r.result["entitlement"] = entitlement;
      r.result["usedCalendarDays"] = Json::Int64(used); r.result["estimatedRemaining"] = Json::Int64(int64_t(entitlement)-used);
    } else if (op == "create") {
      // The row lock serializes creation with employee soft deletion.
      auto rows = co_await db->execSqlCoro("WITH employee AS (SELECT id FROM hr_employee_biodata WHERE tenant_id=$1 AND id=$2 AND is_deleted=false FOR SHARE) INSERT INTO hr_leave_requests(tenant_id,employee_id,leave_type,start_date,end_date,reason,created_by_user_id) SELECT $1::uuid,id,$3,$4::date,$5::date,$6,$7::uuid FROM employee RETURNING id", who.tenantId, body["employeeId"].asString(), body["leaveType"].asString(), body["startDate"].asString(), body["endDate"].asString(), body["reason"].asString(), who.userId);
      if (rows.empty()) co_return fail("not_found", "Employee not found in this tenant.");
      r.result["id"] = rows[0]["id"].as<std::string>();
    } else {
      const std::string status = op == "approve" ? "approved" : op == "reject" ? "rejected" : "cancelled";
      auto rows = co_await db->execSqlCoro("UPDATE hr_leave_requests SET status=$3, decision_note=$4, decided_at=now(), decided_by_user_id=$5, version=version+1 WHERE tenant_id=$1 AND id=$2 AND status='pending' AND version=$6 RETURNING id", who.tenantId, id, status, body["note"].asString(), who.userId, body["version"].asInt());
      if (rows.empty()) co_return fail("conflict", "Request no longer pending or has changed. Refresh and retry.");
      r.result["id"] = id;
    }
    r.success = true; co_return r;
  } catch (const std::exception &) { co_return fail("database_error", "HR service unavailable. Verify migration 036 is installed."); }
}
}
