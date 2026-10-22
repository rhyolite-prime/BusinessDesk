#include "PreferencesService.h"
#include "utils/TransactionUtil.h"
#include <bcrypt.h>
#include <regex>
#include <set>
namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
dto::BaseApiResponse fail(const char *code, const char *msg) {
  dto::BaseApiResponse r;
  r.error["code"] = code;
  r.error["message"] = msg;
  return r;
}
bool uuid(const std::string &s) {
  static const std::regex p(
      "^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");
  return std::regex_match(s, p) && s != "00000000-0000-0000-0000-000000000000";
}
Json::Value json(const std::string &s) {
  Json::Value v;
  Json::Reader r;
  if (!r.parse(s, v))
    throw std::runtime_error("Invalid projection");
  return v;
}
bool fields(const Json::Value &b, std::set<std::string> allowed) {
  if (!b.isObject())
    return false;
  for (auto &k : b.getMemberNames())
    if (!allowed.count(k))
      return false;
  return true;
}
Json::Value defaults() {
  return json(
      R"({"locale":"en-GH","timeZone":"Africa/Accra","dateStyle":"medium","timeFormat":"24h","moneyDecimals":2,"useGrouping":true,"paperSize":"A4","orientation":"portrait"})");
}
bool validSettings(const Json::Value &s) {
  if (!fields(s,
              {"locale", "timeZone", "dateStyle", "timeFormat", "moneyDecimals",
               "useGrouping", "paperSize", "orientation"}) ||
      s.size() != 8)
    return false;
  for (auto k : {"locale", "timeZone", "dateStyle", "timeFormat", "paperSize",
                 "orientation"})
    if (!s[k].isString())
      return false;
  return std::set<std::string>{"en-GH", "en-GB", "en-US", "fr-FR", "de-DE"}
             .count(s["locale"].asString()) &&
         s["timeZone"].asString().size() <= 100 &&
         std::set<std::string>{"short", "medium", "long"}.count(
             s["dateStyle"].asString()) &&
         std::set<std::string>{"12h", "24h"}.count(
             s["timeFormat"].asString()) &&
         s["moneyDecimals"].isInt() && s["moneyDecimals"].asInt() >= 0 &&
         s["moneyDecimals"].asInt() <= 6 && s["useGrouping"].isBool() &&
         std::set<std::string>{"A4", "Letter"}.count(
             s["paperSize"].asString()) &&
         std::set<std::string>{"portrait", "landscape"}.count(
             s["orientation"].asString());
}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr tx, std::string op,
                                       Json::Value body,
                                       utils::AuditIdentity who,
                                       std::string verifiedHash) {
  // Tenant/user locks prevent deactivation, admin revocation or password
  // changes during writes. The hash condition binds execution to fresh
  // reauthentication.
  co_await tx->execSqlCoro("SET LOCAL lock_timeout='5s'");
  co_await tx->execSqlCoro("SET LOCAL statement_timeout='60s'");
  auto tenant = co_await tx->execSqlCoro(
      "SELECT tenancy_name FROM tenants WHERE id=$1 AND is_deleted=false AND "
      "is_active=true" +
          std::string(op == "save" ? " FOR UPDATE" : " FOR SHARE"),
      who.tenantId);
  auto actor = co_await tx->execSqlCoro(
      "SELECT id FROM users WHERE id=$1 AND tenant_id=$2 AND is_deleted=false "
      "AND is_active=true AND is_locked_out=false AND "
      "is_tenant_admin_user=true AND is_host_admin_user=false AND ($3::text='' "
      "OR password_hash=$3) FOR SHARE",
      who.userId, who.tenantId, verifiedHash);
  if (tenant.empty() || actor.empty())
    co_return fail("forbidden", "A live tenant administrator is required.");
  dto::BaseApiResponse result;
  if (op == "save") {
    // Serialize first creation as well as edits; no client-controlled audit
    // fields.
    auto current = co_await tx->execSqlCoro(
        "SELECT settings::text,version FROM core_tenant_preferences WHERE "
        "tenant_id=$1 AND is_deleted=false FOR UPDATE",
        who.tenantId);
    const int version = current.empty() ? 0 : current[0]["version"].as<int>();
    if (version != body["version"].asInt() || version == 2147483647)
      co_return fail("conflict", "Preferences changed. Reload before saving.");
    const std::string settings = Json::FastWriter().write(body["settings"]);
    if (current.empty())
      co_await tx->execSqlCoro("INSERT INTO "
                               "core_tenant_preferences(tenant_id,settings,"
                               "created_by_user_id) VALUES($1,$2::jsonb,$3)",
                               who.tenantId, settings, who.userId);
    else
      co_await tx->execSqlCoro(
          "UPDATE core_tenant_preferences SET "
          "settings=$2::jsonb,version=version+1,last_modified_at=now(),last_"
          "modified_by_user_id=$3 WHERE tenant_id=$1 AND is_deleted=false",
          who.tenantId, settings, who.userId);
    const std::string previous =
        current.empty() ? "null" : current[0]["settings"].as<std::string>();
    co_await tx->execSqlCoro(
        "INSERT INTO "
        "core_tenant_preference_events(tenant_id,created_by_user_id,previous_"
        "settings,settings,version) VALUES($1,$2,$3::jsonb,$4::jsonb,$5)",
        who.tenantId, who.userId, previous, settings, version + 1);
    result.result["settings"] = body["settings"];
    result.result["version"] = version + 1;
  } else if (op == "preview") {
    auto snapshot = co_await tx->execSqlCoro(
        "SELECT tenant_reset_snapshot($1,CASE WHEN $2::boolean THEN NULL ELSE "
        "ARRAY(SELECT jsonb_array_elements_text($3::jsonb)) END)::text AS "
        "snapshot",
        who.tenantId, body["scope"] == "all",
        Json::FastWriter().write(body["tables"]));
    auto plan = json(snapshot[0]["snapshot"].as<std::string>());
    if (!plan["blocked"].empty()) {
      result.error["code"] = "conflict";
      result.error["message"] =
          "Reset blocked. Review dependencies or request operator assistance.";
      result.result = plan;
      co_return result;
    }
    auto saved = co_await tx->execSqlCoro(
        "INSERT INTO "
        "core_tenant_reset_plans(tenant_id,created_by_user_id,requested_tables,"
        "snapshot) VALUES($1,$2,CASE WHEN $3::boolean THEN NULL ELSE "
        "ARRAY(SELECT jsonb_array_elements_text($4::jsonb)) END,$5::jsonb) "
        "RETURNING id,expires_at::text",
        who.tenantId, who.userId, body["scope"] == "all",
        Json::FastWriter().write(body["tables"]),
        Json::FastWriter().write(plan));
    result.result = plan;
    result.result["planId"] = saved[0]["id"].as<std::string>();
    result.result["expiresAt"] = saved[0]["expires_at"].as<std::string>();
    result.result["confirmation"] =
        "RESET " + tenant[0]["tenancy_name"].as<std::string>();
  } else {
    if (body["confirmation"] !=
        "RESET " + tenant[0]["tenancy_name"].as<std::string>())
      co_return fail("validation_error",
                     "Typed confirmation does not match this tenant.");
    auto applied = co_await tx->execSqlCoro(
        "SELECT tenant_reset_apply($1,$2,$3,$4)::text AS result", who.tenantId,
        who.userId, body["planId"].asString(), body["reason"].asString());
    result.result = json(applied[0]["result"].as<std::string>());
    if (result.result.isMember("error"))
      co_return fail(
          "conflict",
          "Plan expired, used or data/dependencies changed. Preview again.");
  }
  result.success = true;
  co_return result;
}
} // namespace
drogon::Task<dto::BaseApiResponse>
PreferencesService::execute(std::string op, Json::Value body,
                            utils::AuditIdentity who) {
  if (!uuid(who.tenantId) || !uuid(who.userId))
    co_return fail("unauthorized", "Tenant authentication required.");
  if (op != "get" && op != "save" && op != "preview" && op != "reset" &&
      op != "history")
    co_return fail("validation_error", "Invalid preferences operation.");
  if (op == "save" &&
      (!fields(body, {"settings", "version"}) || !body["version"].isInt() ||
       body["version"].asInt() < 0 || !validSettings(body["settings"])))
    co_return fail("validation_error",
                   "Provide valid preferences and their current version.");
  if (op == "preview" &&
      (!fields(body, {"scope", "tables"}) ||
       (body["scope"] != "all" && body["scope"] != "selected") ||
       !body["tables"].isArray() || body["tables"].size() > 100 ||
       (body["scope"] == "selected" && body["tables"].empty()) ||
       (body["scope"] == "all" && !body["tables"].empty())))
    co_return fail("validation_error", "Select business tables or explicitly "
                                       "select all tenant business data.");
  if (op == "preview")
    for (auto &t : body["tables"])
      if (!t.isString() ||
          !std::regex_match(t.asString(), std::regex("^[a-z_][a-z0-9_]*$")))
        co_return fail("validation_error", "Invalid table selection.");
  if (op == "reset" &&
      (!fields(body, {"planId", "password", "confirmation", "reason"}) ||
       !body["planId"].isString() || !uuid(body["planId"].asString()) ||
       !body["password"].isString() || body["password"].asString().empty() ||
       body["password"].asString().size() > 1024 ||
       body["password"].asString().find('\0') != std::string::npos ||
       !body["confirmation"].isString() ||
       body["confirmation"].asString().size() > 200 ||
       !body["reason"].isString() || body["reason"].asString().size() > 500 ||
       body["reason"].asString().find_first_not_of(" \t\r\n") ==
           std::string::npos ||
       body["reason"].asString().find('\0') != std::string::npos))
    co_return fail("validation_error",
                   "Provide an owned preview plan, password, exact "
                   "confirmation and a reason (1–500 bytes).");
  try {
    auto db = drogon::app().getDbClient();
    auto ready = co_await db->execSqlCoro(
        "SELECT to_regclass('core_tenant_preferences') IS NOT NULL AND "
        "to_regprocedure('tenant_reset_snapshot(uuid,text[])') IS NOT NULL AND "
        "to_regprocedure('tenant_reset_apply(uuid,uuid,uuid,text)') IS NOT "
        "NULL AS ready");
    if (ready.empty() || !ready[0]["ready"].as<bool>())
      co_return fail("schema_not_ready",
                     "Apply migration 015_tenant_preferences.sql.");
    auto actor = co_await db->execSqlCoro(
        "SELECT u.is_tenant_admin_user,u.password_hash,t.tenancy_name FROM "
        "users u JOIN tenants t ON t.id=u.tenant_id AND t.is_deleted=false AND "
        "t.is_active=true WHERE u.id=$1 AND u.tenant_id=$2 AND "
        "u.is_deleted=false AND u.is_active=true AND u.is_locked_out=false AND "
        "u.is_host_admin_user=false",
        who.userId, who.tenantId);
    if (actor.empty())
      co_return fail("forbidden", "Live tenant user required.");
    const bool admin = actor[0]["is_tenant_admin_user"].as<bool>();
    if (op != "get" && !admin)
      co_return fail("forbidden", "Only tenant administrators can manage "
                                  "preferences and reset business data.");
    dto::BaseApiResponse result;
    if (op == "get") {
      auto current = co_await db->execSqlCoro(
          "SELECT settings::text,version FROM core_tenant_preferences WHERE "
          "tenant_id=$1 AND is_deleted=false",
          who.tenantId);
      result.result["settings"] =
          current.empty() ? defaults()
                          : json(current[0]["settings"].as<std::string>());
      result.result["version"] =
          current.empty() ? 0 : current[0]["version"].as<int>();
      result.result["canManage"] = admin;
      result.result["accountId"] = actor[0]["tenancy_name"].as<std::string>();
      result.result["tables"] = Json::arrayValue;
      if (admin) {
        auto tables = co_await db->execSqlCoro(
            "SELECT table_name,module FROM core_tenant_reset_registry WHERE "
            "to_regclass(format('%I.%I',current_schema(),table_name)) IS NOT "
            "NULL ORDER BY module,table_name");
        for (auto &row : tables) {
          Json::Value t;
          t["table"] = row["table_name"].as<std::string>();
          t["module"] = row["module"].as<std::string>();
          result.result["tables"].append(t);
        }
      }
      result.success = true;
      co_return result;
    }
    if (op == "history") {
      auto events = co_await db->execSqlCoro(
          "SELECT "
          "jsonb_build_object('id',e.id,'status',e.status,'reason',e.reason,'"
          "details',e.details,'createdAt',e.created_at,'actorFullName',NULLIF("
          "btrim(concat_ws(' "
          "',u.first_name,u.last_name)),''),'actorEmail',u.email) AS record "
          "FROM core_tenant_reset_events e LEFT JOIN users u ON "
          "u.id=e.created_by_user_id AND u.tenant_id=e.tenant_id AND "
          "u.is_deleted=false WHERE e.tenant_id=$1 AND e.is_deleted=false "
          "ORDER BY e.created_at DESC,e.id DESC LIMIT 25",
          who.tenantId);
      result.result["items"] = Json::arrayValue;
      for (auto &e : events)
        result.result["items"].append(json(e["record"].as<std::string>()));
      result.success = true;
      co_return result;
    }
    if (op == "save") {
      auto zone = co_await db->execSqlCoro(
          "SELECT name FROM pg_timezone_names WHERE name=$1",
          body["settings"]["timeZone"].asString());
      if (zone.empty())
        co_return fail("validation_error",
                       "Choose a supported IANA time zone.");
    }
    std::string hash;
    if (op == "reset") {
      auto limit = co_await db->execSqlCoro(
          "INSERT INTO core_tenant_reset_auth_limits(tenant_id,user_id) "
          "VALUES($1,$2) ON CONFLICT(tenant_id,user_id) DO UPDATE SET "
          "attempts=CASE WHEN "
          "core_tenant_reset_auth_limits.window_start<now()-interval '15 "
          "minutes' THEN 1 ELSE core_tenant_reset_auth_limits.attempts+1 "
          "END,window_start=CASE WHEN "
          "core_tenant_reset_auth_limits.window_start<now()-interval '15 "
          "minutes' THEN now() ELSE core_tenant_reset_auth_limits.window_start "
          "END RETURNING attempts",
          who.tenantId, who.userId);
      if (limit[0]["attempts"].as<int>() > 5)
        co_return fail(
            "rate_limited",
            "Too many reset authentication attempts. Try again in 15 minutes.");
      hash = actor[0]["password_hash"].as<std::string>();
      if (!bcrypt::validatePassword(body["password"].asString(), hash)) {
        co_await db->execSqlCoro(
            "INSERT INTO "
            "core_tenant_reset_events(tenant_id,created_by_user_id,status,"
            "reason,details) VALUES($1,$2,'failed','Reauthentication "
            "failed','{}')",
            who.tenantId, who.userId);
        co_return fail("reauthentication_failed",
                       "Current password is incorrect. No data was changed.");
      }
      body.removeMember("password");
    }
    auto tx = co_await db->newTransactionCoro();
    try {
      result = co_await run(tx, op, body, who, hash);
    } catch (...) {
      tx->rollback();
      throw;
    }
    if (!result.success) {
      tx->rollback();
      tx.reset();
      if (op == "reset")
        co_await db->execSqlCoro(
            "INSERT INTO "
            "core_tenant_reset_events(tenant_id,created_by_user_id,status,"
            "reason,details) VALUES($1,$2,'failed','Reset rejected; no data "
            "changed','{}')",
            who.tenantId, who.userId);
      co_return result;
    }

    if (!(co_await utils::CommitTransaction{std::move(tx)}))
      co_return fail("database_error", "Commit could not be confirmed. Review "
                                       "reset history before retrying.");
    co_return result;
  } catch (const std::exception &) {
    co_return fail("database_error",
                   "Preferences/reset service unavailable. No partial reset is "
                   "committed; review history before retrying.");
  }
}
} // namespace business_desk::domain_services
