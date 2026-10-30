#include "AccountingPeriodService.h"
#include "utils/TransactionUtil.h"
#include <chrono>
#include <limits>
#include <regex>
namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
dto::BaseApiResponse fail(const char *code, const char *message) {
  dto::BaseApiResponse r;
  r.error["code"] = code;
  r.error["message"] = message;
  return r;
}
bool uuid(const std::string &s) {
  static const std::regex p(
      "^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");
  return std::regex_match(s, p) && s != "00000000-0000-0000-0000-000000000000";
}
bool date(const Json::Value &v) {
  if (!v.isString() ||
      !std::regex_match(v.asString(),
                        std::regex("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")))
    return false;
  auto s = v.asString();
  int y = std::stoi(s.substr(0, 4)), m = std::stoi(s.substr(5, 2)),
      d = std::stoi(s.substr(8, 2));
  return y >= 1900 && y <= 2999 &&
         std::chrono::year_month_day{std::chrono::year{y},
                                     std::chrono::month{unsigned(m)},
                                     std::chrono::day{unsigned(d)}}
             .ok();
}
std::string selection() {
  return R"(SELECT jsonb_build_object('id',id,'accountingUnitId',accounting_unit_id,'period',period,'beginDate',period_start_date::text,'endDate',period_end_date::text,'status',status,'version',version,'lastClosedAt',last_closed_at,'closedByUserId',closed_by_user_id,'closeReason',close_reason,'createdAt',created_at,'createdByUserId',created_by_user_id,'lastModifiedAt',last_modified_at,'lastModifiedByUserId',last_modified_by_user_id) AS record FROM gl_accounting_periods WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false)";
}
Json::Value decode(const Row &row) {
  Json::Value v;
  Json::Reader reader;
  if (!reader.parse(row["record"].as<std::string>(), v))
    throw std::runtime_error("Invalid period data");
  return v;
}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db, std::string op,
                                       std::string id, std::string unit,
                                       Json::Value body,
                                       utils::AuditIdentity who) {
  const bool write = op != "list" && op != "history";
  // Same first lock as JournalService: posting and closing are serialized per
  // unit.
  auto units = co_await db->execSqlCoro(
      "SELECT id FROM core_accounting_units WHERE tenant_id=$1 AND id=$2 AND "
      "is_deleted=false AND is_active=true" +
          std::string(write ? " FOR UPDATE" : ""),
      who.tenantId, unit);
  if (units.empty())
    co_return fail("not_found", "Active accounting unit not found.");
  dto::BaseApiResponse result;
  if (op == "list") {
    const int year = body["year"].asInt();
    auto rows = co_await db->execSqlCoro(
        selection() + " AND period BETWEEN $3 AND $4 ORDER BY period DESC,id",
        who.tenantId, unit, year * 100 + 1, year * 100 + 12);
    result.result["items"] = Json::arrayValue;
    for (const auto &row : rows)
      result.result["items"].append(decode(row));
    result.success = true;
    co_return result;
  }
  if (op == "history") {
    auto rows = co_await db->execSqlCoro(selection() + " AND id=$3",
                                         who.tenantId, unit, id);
    if (rows.empty())
      co_return fail("not_found", "Accounting period not found.");
    auto events = co_await db->execSqlCoro(R"(
SELECT jsonb_build_object('action',e.action,'previousStatus',e.previous_status,
 'newStatus',e.new_status,'version',e.version,'reason',e.reason,'createdAt',e.created_at,
 'createdByUserId',e.created_by_user_id,
 'actorFullName',NULLIF(btrim(concat_ws(' ',NULLIF(btrim(u.first_name),''),NULLIF(btrim(u.last_name),''))),''),
 'actorEmail',NULLIF(btrim(u.email),'')) AS record
FROM gl_accounting_period_events e
LEFT JOIN users u ON u.id=e.created_by_user_id AND u.tenant_id=e.tenant_id AND u.is_deleted=false
WHERE e.tenant_id=$1 AND e.accounting_unit_id=$2 AND e.period_id=$3 AND e.is_deleted=false
ORDER BY e.version DESC)", who.tenantId, unit, id);
    result.result["items"] = Json::arrayValue;
    for (const auto &row : events)
      result.result["items"].append(decode(row));
    result.success = true;
    co_return result;
  }
  std::string before, after, action, reason = body.get("reason", "").asString();
  if (op == "create") {
    auto overlap = co_await db->execSqlCoro(
        "SELECT id FROM gl_accounting_periods WHERE tenant_id=$1 AND "
        "accounting_unit_id=$2 AND is_deleted=false AND "
        "period_start_date<=$4::date AND period_end_date>=$3::date LIMIT 1",
        who.tenantId, unit, body["beginDate"].asString(),
        body["endDate"].asString());
    if (!overlap.empty())
      co_return fail("conflict",
                     "Period dates overlap an existing live period.");
    auto rows = co_await db->execSqlCoro(
        "INSERT INTO "
        "gl_accounting_periods(tenant_id,accounting_unit_id,period,period_"
        "start_date,period_end_date,status,created_by_user_id) "
        "VALUES($1,$2,$3,$4::date,$5::date,'closed',$6) RETURNING id",
        who.tenantId, unit, body["period"].asInt(),
        body["beginDate"].asString(), body["endDate"].asString(), who.userId);
    id = rows[0]["id"].as<std::string>();
    after = "closed";
    action = "created";
  } else {
    auto rows = co_await db->execSqlCoro(selection() + " AND id=$3 FOR UPDATE",
                                         who.tenantId, unit, id);
    if (rows.empty())
      co_return fail("not_found", "Accounting period not found.");
    const auto current = decode(rows[0]);
    if (current["version"] != body["version"])
      co_return fail("conflict",
                     "Period changed. Refresh before changing its status.");
    before = current["status"].asString();
    if (before == "locked")
      co_return fail("conflict",
                     "Locked periods cannot be opened or closed here.");
    after = op == "open" ? "open" : "closed";
    action = op == "open" ? "opened" : "closed";
    if (before == after) {
      result.success = true;
      result.result = current;
      co_return result;
    }
    if (current["version"].asInt() == std::numeric_limits<int>::max())
      co_return fail("conflict", "Period version exhausted.");
    co_await db->execSqlCoro(
        "UPDATE gl_accounting_periods SET "
        "status=$4::text,version=version+1,last_modified_at=now(),last_"
        "modified_by_user_id=$5,last_closed_at=CASE WHEN $4='closed' THEN "
        "now() ELSE last_closed_at END,closed_by_user_id=CASE WHEN $4='closed' "
        "THEN $5::uuid ELSE closed_by_user_id END,close_reason=CASE WHEN "
        "$4='closed' THEN $6 ELSE close_reason END WHERE tenant_id=$1 AND "
        "accounting_unit_id=$2 AND id=$3 AND is_deleted=false",
        who.tenantId, unit, id, after, who.userId, reason);
  }
  co_await db->execSqlCoro(
      "INSERT INTO "
      "gl_accounting_period_events(tenant_id,accounting_unit_id,period_id,"
      "action,previous_status,new_status,version,reason,created_by_user_id) "
      "SELECT "
      "tenant_id,accounting_unit_id,id,$4,NULLIF($5,''),status,version,$6,$7 "
      "FROM gl_accounting_periods WHERE tenant_id=$1 AND accounting_unit_id=$2 "
      "AND id=$3 AND is_deleted=false",
      who.tenantId, unit, id, action, before, reason, who.userId);
  auto saved = co_await db->execSqlCoro(selection() + " AND id=$3",
                                        who.tenantId, unit, id);
  result.success = true;
  result.result = decode(saved[0]);
  co_return result;
}
} // namespace
drogon::Task<dto::BaseApiResponse>
AccountingPeriodService::execute(std::string op, std::string id,
                                 std::string unit, Json::Value body,
                                 utils::AuditIdentity who) {
  if (!uuid(who.tenantId) || !uuid(who.userId))
    co_return fail("unauthorized", "Tenant authentication required.");
  if (op != "list" && op != "create" && op != "open" && op != "close" &&
      op != "history")
    co_return fail("validation_error", "Invalid operation.");
  if (!uuid(unit) ||
      ((op == "open" || op == "close" || op == "history") && !uuid(id)))
    co_return fail("validation_error",
                   "Valid unit and period IDs are required.");
  if (op == "list") {
    if (!body.isNull() && !body.isObject())
      co_return fail("validation_error", "Expected a year filter object.");
    if (body.isNull())
      body = Json::objectValue;
    if (!body.isMember("year")) {
      auto today =
          std::chrono::year_month_day{std::chrono::floor<std::chrono::days>(
              std::chrono::system_clock::now())};
      body["year"] = int(today.year());
    }
    if (!body["year"].isInt() || body["year"].asInt() < 1900 ||
        body["year"].asInt() > 2999)
      co_return fail("validation_error", "Year must be 1900–2999.");
  } else if (op != "history") {
    if (!body.isObject() || !body["accountingUnitId"].isString() ||
        body["accountingUnitId"].asString() != unit)
      co_return fail("validation_error", "Accounting-unit scope mismatch.");
    for (const auto &k : body.getMemberNames())
      if (k != "accountingUnitId" &&
          (op == "create"
               ? (k != "period" && k != "beginDate" && k != "endDate")
               : (k != "version" && k != "reason")))
        co_return fail("validation_error",
                       "Unexpected period property. Scope, status and audits "
                       "are server-owned.");
    if (op == "create") {
      if (!body["period"].isInt() || body["period"].asInt() < 190001 ||
          body["period"].asInt() > 299912 || body["period"].asInt() % 100 < 1 ||
          body["period"].asInt() % 100 > 12 || !date(body["beginDate"]) ||
          !date(body["endDate"]) ||
          body["beginDate"].asString() > body["endDate"].asString())
        co_return fail("validation_error",
                       "Provide a valid YYYYMM period code and ordered real "
                       "dates (1900–2999).");
    } else {
      if (!body["version"].isInt() || body["version"].asInt() < 1 ||
          !body["reason"].isString() ||
          body["reason"].asString().size() > 500 ||
          body["reason"].asString().find('\0') != std::string::npos)
        co_return fail(
            "validation_error",
            "Provide the current version and a reason of 1–500 bytes.");
      auto reason = body["reason"].asString();
      const auto a = reason.find_first_not_of(" \t\r\n"),
                 b = reason.find_last_not_of(" \t\r\n");
      if (a == std::string::npos)
        co_return fail(
            "validation_error",
            "A reason is required when opening or closing a period.");
      body["reason"] = reason.substr(a, b - a + 1);
    }
  }
  try {
    auto db = drogon::app().getDbClient();
    auto ready = co_await db->execSqlCoro(
        "SELECT EXISTS(SELECT 1 FROM pg_attribute WHERE "
        "attrelid=to_regclass('gl_accounting_periods') AND attname='version' "
        "AND NOT attisdropped) AND to_regclass('gl_accounting_period_events') "
        "IS NOT NULL AS ready");
    if (ready.empty() || !ready[0]["ready"].as<bool>())
      co_return fail("schema_not_ready",
                     "Apply migration 013_accounting_period_management.sql "
                     "before managing accounting periods.");
    if (op == "list" || op == "history")
      co_return co_await run(db, op, id, unit, body, who);
    auto tx = co_await db->newTransactionCoro();
    dto::BaseApiResponse result;
    try {
      result = co_await run(tx, op, id, unit, body, who);
    } catch (...) {
      tx->rollback();
      throw;
    }
    if (!result.success) {
      tx->rollback();
      co_return result;
    }
    if (!(co_await utils::CommitTransaction{std::move(tx)}))
      co_return fail("database_error",
                     "Period transaction could not be committed.");
    co_return result;
  } catch (const UniqueViolation &) {
    co_return fail("conflict",
                   "This period code already exists in the accounting unit.");
  } catch (const std::exception &) {
    co_return fail("database_error", "Accounting period service unavailable.");
  }
}
} // namespace business_desk::domain_services
