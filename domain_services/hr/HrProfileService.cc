#include "HrProfileService.h"
#include "constants/TenantConstants.h"
#include "domain_services/permissions/PermissionService.h"
#include "utils/TransactionUtil.h"
#include <algorithm>
#include <cctype>
#include <regex>
#include <set>
#include <stdexcept>

namespace business_desk::domain_services {
namespace {
dto::BaseApiResponse fail(const char *code, const std::string &message) {
  dto::BaseApiResponse r; r.error["code"] = code; r.error["message"] = message; return r;
}
bool uuid(const std::string &s) {
  static const std::regex re("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");
  return std::regex_match(s,re) && s != "00000000-0000-0000-0000-000000000000";
}
std::string trim(const std::string &s) {
  const auto a=s.find_first_not_of(" \t\r\n"), b=s.find_last_not_of(" \t\r\n");
  return a==std::string::npos ? "" : s.substr(a,b-a+1);
}
bool validText(const Json::Value &v, unsigned max) {
  if (!v.isString()) return false;
  const auto s=v.asString();
  return s.find('\0') == std::string::npos && std::count_if(s.begin(),s.end(),[](unsigned char c){ return (c & 0xc0) != 0x80; }) <= max;
}
bool version(const Json::Value &v) { return v.isInt() && v.asInt() > 0 && v.asInt() < 2147483647; }
Json::Value parse(const std::string &s) {
  Json::Value v; Json::Reader reader;
  if (!reader.parse(s,v)) throw std::runtime_error("Invalid database JSON");
  return v;
}
}
drogon::Task<dto::BaseApiResponse> HrProfileService::execute(std::string op, std::string id, Json::Value body, std::string page, utils::AuditIdentity who) {
  if (!uuid(who.tenantId) || !uuid(who.userId) || who.tenantId == constants::kHostTenantId)
    co_return fail("unauthorized","Tenant sign-in required.");
  // PostgreSQL returns canonical lower-case UUID text. Normalize the verified
  // identity as well before comparing it with the requester for maker-checker.
  std::transform(who.userId.begin(),who.userId.end(),who.userId.begin(),[](unsigned char c){ return std::tolower(c); });
  if (!std::set<std::string>{"me","list","submit","approve","reject"}.count(op))
    co_return fail("validation_error","Unknown operation.");
  int p=1;
  if (!page.empty()) {
    try { size_t end=0; p=std::stoi(page,&end); if (end != page.size() || p<1 || p>1000000) throw std::invalid_argument("page"); }
    catch (...) { co_return fail("validation_error","Invalid page."); }
  }
  if ((op=="approve" || op=="reject") && !uuid(id)) co_return fail("validation_error","Invalid request ID.");
  if (op=="submit") {
    if (!body.isObject() || !version(body["employeeVersion"]) || !body["changes"].isObject() || body["changes"].empty() || body.size()!=2)
      co_return fail("validation_error","Provide the employee version and at least one permitted change.");
    const std::set<std::string> allowed{"personalEmail","primaryPhoneNumber","secondaryPhoneNumber","residenceAddress","cityOrLocation"};
    for (const auto &key : body["changes"].getMemberNames()) {
      if (!allowed.count(key)) co_return fail("validation_error","This field cannot be changed through self-service.");
      const unsigned limit = key=="residenceAddress" ? 150 : key=="primaryPhoneNumber" || key=="secondaryPhoneNumber" ? 20 : 100;
      auto &value=body["changes"][key];
      if (!validText(value,limit)) co_return fail("validation_error","Invalid contact field or length.");
      value=trim(value.asString());
      if (key=="personalEmail" && !value.asString().empty() && !std::regex_match(value.asString(),std::regex(R"(^[^\s@]+@[^\s@]+\.[^\s@]+$)")))
        co_return fail("validation_error","Invalid email address.");
    }
  } else if (op=="approve" || op=="reject") {
    if (!body.isObject() || body.size()!=2 || !version(body["version"]) || !validText(body["note"],500))
      co_return fail("validation_error","Provide a valid request version and note.");
    body["note"] = trim(body["note"].asString());
  }
  try {
    auto db=drogon::app().getDbClient();
    auto actor=co_await db->execSqlCoro("SELECT u.is_tenant_admin_user FROM users u JOIN tenants t ON t.id=u.tenant_id AND t.is_active=true AND t.is_deleted=false WHERE u.id=$1 AND u.tenant_id=$2 AND u.is_active=true AND u.is_deleted=false AND u.is_locked_out=false AND u.is_host_admin_user=false",who.userId,who.tenantId);
    if (actor.empty()) co_return fail("forbidden","A live tenant user is required.");
    bool canReview=actor[0]["is_tenant_admin_user"].as<bool>();
    if (!canReview && op!="me" && op!="submit") {
      auto grants=co_await PermissionService::getUserPermissions(who.userId);
      canReview=grants.count("*") || grants.count("employees.write") || grants.count("employees.manage") || grants.count("hr.profile.approve");
    }
    if ((op=="approve" || op=="reject") && !canReview) co_return fail("forbidden","Profile approval permission required.");
    dto::BaseApiResponse r;
    if (op=="me") {
      // This projection is intentionally independent of the sensitive biodata API.
      auto rows=co_await db->execSqlCoro("SELECT jsonb_build_object('id',e.id,'version',e.version,'employeeIdentifier',e.employee_identifier,'firstName',e.first_name,'otherName',e.other_name,'lastName',e.last_name,'departmentName',e.department_name,'companyEmail',e.company_email,'personalEmail',e.personal_email,'primaryPhoneNumber',e.primary_phone_number,'secondaryPhoneNumber',e.secondary_phone_number,'residenceAddress',e.residence_address,'cityOrLocation',e.city_or_location)::text AS record FROM hr_employee_biodata e WHERE e.tenant_id=$1 AND e.user_id=$2 AND e.is_deleted=false",who.tenantId,who.userId);
      if (rows.empty()) co_return fail("not_found","No live employee record is linked to your account.");
      r.result=parse(rows[0]["record"].as<std::string>());
    } else if (op=="list") {
      const std::string filter=" WHERE r.tenant_id=$1 AND ($3::boolean OR (r.requested_by_user_id=$2 AND EXISTS (SELECT 1 FROM hr_employee_biodata e WHERE e.tenant_id=r.tenant_id AND e.id=r.employee_id AND e.user_id=$2 AND e.is_deleted=false)))";
      auto counts=co_await db->execSqlCoro("SELECT count(*) AS total FROM hr_profile_change_requests r"+filter,who.tenantId,who.userId,canReview);
      auto rows=co_await db->execSqlCoro("SELECT jsonb_build_object('id',r.id,'employeeId',r.employee_id,'employeeName',concat_ws(' ',e.first_name,NULLIF(e.other_name,''),e.last_name),'employeeIdentifier',e.employee_identifier,'changes',r.proposed,'status',r.status,'createdAt',r.created_at,'decidedAt',r.decided_at,'decisionNote',r.decision_note,'version',r.version,'canDecide',($3::boolean AND r.requested_by_user_id<>$2::uuid AND r.status='pending'))::text AS record FROM hr_profile_change_requests r JOIN hr_employee_biodata e ON e.tenant_id=r.tenant_id AND e.id=r.employee_id"+filter+" ORDER BY r.created_at DESC,r.id DESC LIMIT 20 OFFSET $4",who.tenantId,who.userId,canReview,(int64_t(p)-1)*20);
      r.result["data"]=Json::arrayValue;
      for (const auto &row:rows) r.result["data"].append(parse(row["record"].as<std::string>()));
      r.result["totalCount"]=Json::Int64(counts[0]["total"].as<int64_t>());
      r.result["canReview"]=canReview;
    } else if (op=="submit") {
      const auto changes=Json::writeString(Json::StreamWriterBuilder{},body["changes"]);
      auto rows=co_await db->execSqlCoro("WITH employee AS (SELECT id,version FROM hr_employee_biodata WHERE tenant_id=$1 AND user_id=$2 AND is_deleted=false AND version=$3 FOR SHARE), saved AS (INSERT INTO hr_profile_change_requests(tenant_id,employee_id,requested_by_user_id,employee_version,proposed) SELECT $1::uuid,id,$2::uuid,version,$4::jsonb FROM employee RETURNING id,tenant_id,version), event AS (INSERT INTO hr_profile_change_events(tenant_id,request_id,action,version,actor_user_id) SELECT tenant_id,id,'submitted',version,$2::uuid FROM saved RETURNING request_id) SELECT request_id AS id FROM event",who.tenantId,who.userId,body["employeeVersion"].asInt(),changes);
      if (rows.empty()) co_return fail("conflict","Employee record changed or is no longer linked. Reload and retry.");
      r.result["id"]=rows[0]["id"].as<std::string>();
    } else {
      auto tx=co_await db->newTransactionCoro();
      try {
        auto rows=co_await tx->execSqlCoro("SELECT employee_id,requested_by_user_id,employee_version,proposed::text AS proposed,status,version FROM hr_profile_change_requests WHERE tenant_id=$1 AND id=$2 FOR UPDATE",who.tenantId,id);
        if (rows.empty()) { tx->rollback(); co_return fail("not_found","Request not found."); }
        const auto row=rows[0];
        if (row["status"].as<std::string>()!="pending" || row["version"].as<int>()!=body["version"].asInt()) { tx->rollback(); co_return fail("conflict","Request changed or is no longer pending."); }
        const auto requester=row["requested_by_user_id"].as<std::string>();
        if (requester==who.userId) { tx->rollback(); co_return fail("forbidden","A different authorized reviewer must decide this request."); }
        if (op=="approve") {
          auto updated=co_await tx->execSqlCoro("UPDATE hr_employee_biodata SET personal_email=CASE WHEN $5::jsonb ? 'personalEmail' THEN $5::jsonb->>'personalEmail' ELSE personal_email END, primary_phone_number=CASE WHEN $5::jsonb ? 'primaryPhoneNumber' THEN $5::jsonb->>'primaryPhoneNumber' ELSE primary_phone_number END, secondary_phone_number=CASE WHEN $5::jsonb ? 'secondaryPhoneNumber' THEN $5::jsonb->>'secondaryPhoneNumber' ELSE secondary_phone_number END, residence_address=CASE WHEN $5::jsonb ? 'residenceAddress' THEN $5::jsonb->>'residenceAddress' ELSE residence_address END, city_or_location=CASE WHEN $5::jsonb ? 'cityOrLocation' THEN $5::jsonb->>'cityOrLocation' ELSE city_or_location END,last_modified_at=now(),last_modified_by_user_id=$6,version=version+1 WHERE tenant_id=$1 AND id=$2 AND user_id=$3 AND version=$4 AND is_deleted=false RETURNING id",who.tenantId,row["employee_id"].as<std::string>(),requester,row["employee_version"].as<int>(),row["proposed"].as<std::string>(),who.userId);
          if (updated.empty()) { tx->rollback(); co_return fail("conflict","Employee record changed or account link was removed. Reject and resubmit after review."); }
        }
        const std::string status=op=="approve" ? "approved" : "rejected";
        co_await tx->execSqlCoro("UPDATE hr_profile_change_requests SET status=$3,decided_at=now(),decided_by_user_id=$4,decision_note=$5,version=version+1 WHERE tenant_id=$1 AND id=$2",who.tenantId,id,status,who.userId,body["note"].asString());
        co_await tx->execSqlCoro("INSERT INTO hr_profile_change_events(tenant_id,request_id,action,version,actor_user_id) VALUES($1,$2,$3,$4,$5)",who.tenantId,id,status,body["version"].asInt()+1,who.userId);
      } catch (...) { tx->rollback(); throw; }
      if (!(co_await utils::CommitTransaction{std::move(tx)})) co_return fail("database_error","Unable to commit profile decision.");
      r.result["id"]=id;
    }
    r.success=true; co_return r;
  } catch (const drogon::orm::UniqueViolation &) {
    co_return fail("conflict","A pending request already exists for this employee.");
  } catch (const std::exception &) {
    co_return fail("database_error","Profile service unavailable. Verify migration 038 is installed.");
  }
}
}
