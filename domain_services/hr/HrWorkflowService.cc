#include "HrWorkflowService.h"
#include "constants/TenantConstants.h"
#include "domain_services/permissions/PermissionService.h"
#include <chrono>
#include <regex>
#include <set>
#include <stdexcept>

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
  int y = std::stoi(s.substr(0,4));
  return y >= 1900 && std::chrono::year_month_day{std::chrono::year{y}, std::chrono::month{unsigned(std::stoi(s.substr(5,2)))}, std::chrono::day{unsigned(std::stoi(s.substr(8,2)))}}.ok();
}
bool text(const Json::Value &v, size_t limit, bool required = false) {
  if (!v.isString()) return false;
  auto s = v.asString();
  return s.size() <= limit && s.find('\0') == std::string::npos && (!required || s.find_first_not_of(" \t\r\n") != std::string::npos);
}
bool only(const Json::Value &v, const std::set<std::string> &allowed) {
  if (!v.isObject()) return false;
  for (const auto &key : v.getMemberNames()) if (!allowed.count(key)) return false;
  return true;
}
Json::Value parse(const std::string &s) {
  Json::Value v; Json::Reader reader;
  if (!reader.parse(s,v)) throw std::runtime_error("Invalid database JSON");
  return v;
}
// Only these transitions are allowed. SQL fragments below are fixed constants,
// never built from request values.
std::string sources(const std::string &kind, const std::string &status) {
  if (kind == "vacancy" && status == "closed") return "'open'";
  if (kind == "candidate") {
    if (status == "screening") return "'applied'";
    if (status == "interview") return "'screening'";
    if (status == "offer") return "'interview'";
    if (status == "hired") return "'offer'";
    if (status == "rejected") return "'applied','screening','interview','offer'";
  }
  if (kind == "onboarding" && (status == "completed" || status == "cancelled")) return "'open'";
  if (kind == "review" && (status == "completed" || status == "cancelled")) return "'draft'";
  return {};
}
}
drogon::Task<dto::BaseApiResponse> HrWorkflowService::execute(std::string kind, std::string op, std::string id, Json::Value body, std::string page, utils::AuditIdentity who) {
  if (!uuid(who.tenantId) || !uuid(who.userId) || who.tenantId == constants::kHostTenantId) co_return fail("unauthorized", "Tenant sign-in required.");
  if (!std::set<std::string>{"vacancy","candidate","onboarding","review"}.count(kind) || !std::set<std::string>{"list","create","update","transition"}.count(op)) co_return fail("validation_error", "Unknown HR workflow.");
  const bool write = op != "list";
  int p = 1;
  if (!page.empty()) {
    try { size_t end = 0; p = std::stoi(page,&end); if (end != page.size() || p < 1 || p > 1000000) throw std::invalid_argument("page"); }
    catch (...) { co_return fail("validation_error", "Invalid page."); }
  }
  if ((op == "update" || op == "transition") && !uuid(id)) co_return fail("validation_error", "Invalid record ID.");
  if (op == "create" || op == "update") {
    if (!only(body,{"title","personName","email","employeeId","dueDate","notes","version"}) ||
        (op == "create" && body.isMember("version")) ||
        (op == "update" && (!body["version"].isInt() || body["version"].asInt() < 1 || body["version"].asInt() == 2147483647)) ||
        !text(body["title"],150,true) || !text(body["personName"],150,kind == "candidate") || !text(body["email"],150) || !text(body["notes"],4000) || !text(body["employeeId"],36) || !text(body["dueDate"],10) ||
        ((kind == "onboarding" || kind == "review") ? !uuid(body["employeeId"].asString()) : !body["employeeId"].asString().empty()) ||
        (kind != "candidate" && (!body["personName"].asString().empty() || !body["email"].asString().empty())) ||
        (!body["dueDate"].asString().empty() && !date(body["dueDate"].asString())) ||
        (!body["email"].asString().empty() && !std::regex_match(body["email"].asString(), std::regex(R"(^[^\s@]+@[^\s@]+\.[^\s@]+$)"))))
      co_return fail("validation_error", "Check the required fields, employee, email, date and field lengths.");
  } else if (op == "transition") {
    if (!only(body,{"version","status"}) || !body["version"].isInt() || body["version"].asInt() < 1 || body["version"].asInt() == 2147483647 || !body["status"].isString() || sources(kind,body["status"].asString()).empty())
      co_return fail("validation_error", "Invalid status or version.");
  }
  try {
    auto db = drogon::app().getDbClient();
    auto actor = co_await db->execSqlCoro("SELECT u.is_tenant_admin_user FROM users u JOIN tenants t ON t.id=u.tenant_id AND t.is_active=true AND t.is_deleted=false WHERE u.id=$1 AND u.tenant_id=$2 AND u.is_active=true AND u.is_deleted=false AND u.is_locked_out=false AND u.is_host_admin_user=false", who.userId,who.tenantId);
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
      auto counts = co_await db->execSqlCoro("SELECT count(*) AS total FROM hr_people_work_items WHERE tenant_id=$1 AND kind=$2", who.tenantId,kind);
      auto rows = co_await db->execSqlCoro("SELECT jsonb_build_object('id',w.id,'title',w.title,'employeeId',coalesce(w.employee_id::text,''),'employeeName',concat_ws(' ',e.first_name,NULLIF(e.other_name,''),e.last_name),'employeeIdentifier',coalesce(e.employee_identifier,''),'personName',w.person_name,'email',w.email,'dueDate',coalesce(w.due_date::text,''),'notes',w.notes,'status',w.status,'version',w.version,'createdAt',w.created_at,'updatedAt',w.last_modified_at)::text AS record FROM hr_people_work_items w LEFT JOIN hr_employee_biodata e ON e.tenant_id=w.tenant_id AND e.id=w.employee_id WHERE w.tenant_id=$1 AND w.kind=$2 ORDER BY w.created_at DESC,w.id DESC LIMIT 20 OFFSET $3", who.tenantId,kind,(int64_t(p)-1)*20);
      r.result["data"] = Json::arrayValue;
      for (const auto &row : rows) r.result["data"].append(parse(row["record"].as<std::string>()));
      r.result["totalCount"] = Json::Int64(counts[0]["total"].as<int64_t>()); r.result["canWrite"] = canWrite;
    } else if (op == "create" || op == "update") {
      const auto employee = body["employeeId"].asString();
      const auto title = body["title"].asString(), person = body["personName"].asString(), email = body["email"].asString(), due = body["dueDate"].asString(), notes = body["notes"].asString();
      if (op == "create") {
        const std::string status = kind == "candidate" ? "applied" : kind == "review" ? "draft" : "open";
        auto rows = co_await db->execSqlCoro("WITH employee AS (SELECT id FROM hr_employee_biodata WHERE tenant_id=$1 AND id=nullif($3,'')::uuid AND is_deleted=false FOR SHARE), saved AS (INSERT INTO hr_people_work_items(tenant_id,kind,employee_id,title,person_name,email,due_date,notes,status,created_by_user_id) SELECT $1::uuid,$2,nullif($3,'')::uuid,$4,$5,$6,nullif($7,'')::date,$8,$9,$10::uuid WHERE $3='' OR EXISTS(SELECT 1 FROM employee) RETURNING id,tenant_id,status,version), event AS (INSERT INTO hr_people_work_events(tenant_id,work_item_id,action,status,version,created_by_user_id) SELECT tenant_id,id,'created',status,version,$10::uuid FROM saved RETURNING work_item_id) SELECT work_item_id AS id FROM event",who.tenantId,kind,employee,title,person,email,due,notes,status,who.userId);
        if (rows.empty()) co_return fail("not_found", "Employee not found in this tenant.");
        r.result["id"] = rows[0]["id"].as<std::string>();
      } else {
        auto rows = co_await db->execSqlCoro("WITH employee AS (SELECT id FROM hr_employee_biodata WHERE tenant_id=$1 AND id=nullif($4,'')::uuid AND is_deleted=false FOR SHARE), saved AS (UPDATE hr_people_work_items SET employee_id=nullif($4,'')::uuid,title=$5,person_name=$6,email=$7,due_date=nullif($8,'')::date,notes=$9,last_modified_at=now(),last_modified_by_user_id=$10,version=version+1 WHERE tenant_id=$1 AND kind=$2 AND id=$3 AND version=$11 AND status IN ('open','draft','applied','screening','interview','offer') AND ($4='' OR EXISTS(SELECT 1 FROM employee)) RETURNING id,tenant_id,status,version), event AS (INSERT INTO hr_people_work_events(tenant_id,work_item_id,action,status,version,created_by_user_id) SELECT tenant_id,id,'updated',status,version,$10::uuid FROM saved RETURNING work_item_id) SELECT work_item_id AS id FROM event",who.tenantId,kind,id,employee,title,person,email,due,notes,who.userId,body["version"].asInt());
        if (rows.empty()) co_return fail("conflict", "Record changed, is closed, or employee is unavailable. Refresh and retry.");
        r.result["id"] = id;
      }
    } else {
      const auto status = body["status"].asString();
      const auto allowed = sources(kind,status);
      auto rows = co_await db->execSqlCoro("WITH saved AS (UPDATE hr_people_work_items SET status=$4,last_modified_at=now(),last_modified_by_user_id=$5,version=version+1 WHERE tenant_id=$1 AND kind=$2 AND id=$3 AND version=$6 AND status IN (" + allowed + ") RETURNING id,tenant_id,status,version), event AS (INSERT INTO hr_people_work_events(tenant_id,work_item_id,action,status,version,created_by_user_id) SELECT tenant_id,id,'transitioned',status,version,$5::uuid FROM saved RETURNING work_item_id) SELECT work_item_id AS id FROM event",who.tenantId,kind,id,status,who.userId,body["version"].asInt());
      if (rows.empty()) co_return fail("conflict", "Record changed or transition is no longer valid. Refresh and retry.");
      r.result["id"] = id;
    }
    r.success = true; co_return r;
  } catch (const std::exception &) { co_return fail("database_error", "HR workflows unavailable. Verify migration 037 is installed."); }
}
}
