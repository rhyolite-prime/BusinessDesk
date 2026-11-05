#include "TenantAccountService.h"
#include "utils/TransactionUtil.h"
#include <algorithm>
#include <chrono>
#include <regex>
#include <set>
#include <vector>
namespace business_desk::domain_services {
namespace {
using drogon::orm::DbClientPtr;
const std::vector<std::string> modules = {"gl",
                                          "payroll",
                                          "school_manager",
                                          "ap",
                                          "ar",
                                          "fixed_assets",
                                          "human_resource",
                                          "inventory",
                                          "manufacturing",
                                          "point_of_sale",
                                          "core_banking",
                                          "supply_chain",
                                          "property_rentals",
                                          "document_management"};
bool uuid(const std::string &s) {
  return std::regex_match(
             s, std::regex(
                    "^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$")) &&
         s != "00000000-0000-0000-0000-000000000000";
}
dto::BaseApiResponse fail(std::string code, std::string message) {
  dto::BaseApiResponse r;
  r.error["code"] = code;
  r.error["message"] = message;
  return r;
}
void keys(const Json::Value &v, std::set<std::string> allowed) {
  if (!v.isObject())
    throw std::invalid_argument("Expected an object.");
  for (auto k : v.getMemberNames())
    if (!allowed.count(k))
      throw std::invalid_argument("Unexpected/server-owned field: " + k);
}
void text(const Json::Value &v, size_t n, bool required = false) {
  if (!v.isString() || v.asString().size() > n ||
      v.asString().find('\0') != std::string::npos ||
      (required &&
       v.asString().find_first_not_of(" \r\n\t") == std::string::npos))
    throw std::invalid_argument("Missing or oversized text.");
}
void date(const Json::Value &v) {
  if (v.isNull() || v == "")
    return;
  if (!v.isString() ||
      !std::regex_match(v.asString(),
                        std::regex("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")))
    throw std::invalid_argument("Use real ISO dates or null.");
  auto s = v.asString();
  int y = std::stoi(s.substr(0, 4));
  if (y < 1900 || y > 2999 ||
      !std::chrono::year_month_day{
          std::chrono::year(y),
          std::chrono::month(unsigned(std::stoi(s.substr(5, 2)))),
          std::chrono::day(unsigned(std::stoi(s.substr(8, 2))))}
           .ok())
    throw std::invalid_argument("Invalid date.");
}
std::string json(const Json::Value &v) { return Json::FastWriter().write(v); }
Json::Value parse(const std::string &s) {
  Json::Value v;
  Json::Reader r;
  if (!r.parse(s, v))
    throw std::runtime_error("Invalid stored account.");
  return v;
}
std::string projection() {
  std::string s =
      R"(jsonb_build_object('id',t.id,'accountId',t.tenancy_name,'name',t.name,'isActive',t.is_active,'version',t.account_version,'country',COALESCE(t.country,''),'requireTwoFactorAuth',t.require_two_factor_auth,'createdAt',t.creation_time,'updatedAt',t.last_modification_time,'modules',jsonb_build_object()";
  for (const auto &m : modules) {
    s += "'" + m + "',jsonb_build_object('enabled',t.has_subscribed_to_" + m +
         ",'startDate',t." + m + "_subscription_start_date::date,'endDate',t." +
         m + "_subscription_end_date::date,'fee',t." + m +
         "_subscription_fee::text,'billingCycle',COALESCE(t." + m +
         "_billing_cycle,''),'nextRenewalDate',t." + m +
         "_next_renewal_date::date,'effective',t.is_active AND "
         "t.has_subscribed_to_" +
         m + " AND (t." + m + "_subscription_start_date IS NULL OR t." + m +
         "_subscription_start_date::date<=CURRENT_DATE) AND (t." + m +
         "_subscription_end_date IS NULL OR t." + m +
         "_subscription_end_date::date>=CURRENT_DATE)),";
  }
  s.pop_back();
  s +=
      R"(),'billing',jsonb_build_object('currencyId',p.currency_id,'currencyCode',c.code,'email',COALESCE(p.email,''),'phone',COALESCE(p.phone,''),'paymentMethod',COALESCE(p.payment_method,'unconfigured')))::text AS record)";
  return s;
}
std::string select() {
  return "SELECT " + projection() +
         " FROM tenants t LEFT JOIN core_tenant_billing_profiles p ON "
         "p.tenant_id=t.id AND p.is_deleted=false LEFT JOIN core_currencies c "
         "ON c.id=p.currency_id AND c.is_deleted=false WHERE "
         "t.is_deleted=false AND "
         "t.id<>'00000000-0000-4000-8000-000000000001'::uuid";
}
drogon::Task<Json::Value> detail(DbClientPtr db, std::string id) {
  auto r = co_await db->execSqlCoro(select() + " AND t.id=$1", id);
  if (r.empty())
    co_return Json::Value{};
  co_return parse(r[0]["record"].as<std::string>());
}
void validate(const Json::Value &b) {
  keys(b, {"version", "name", "country", "isActive", "requireTwoFactorAuth",
           "modules", "billing"});
  if (!b["version"].isInt() || b["version"].asInt() < 1 ||
      !b["isActive"].isBool() || !b["requireTwoFactorAuth"].isBool())
    throw std::invalid_argument(
        "Current version and boolean account/security flags required.");
  text(b["name"], 128, true);
  text(b["country"], 20);
  if (!b["modules"].isObject() || b["modules"].size() != modules.size())
    throw std::invalid_argument("Supply every supported module.");
  for (auto m : modules) {
    auto &v = b["modules"][m];
    keys(v, {"enabled", "startDate", "endDate", "fee", "billingCycle",
             "nextRenewalDate"});
    if (v.size() != 6 || !v["enabled"].isBool() || !v["fee"].isString() ||
        !std::regex_match(v["fee"].asString(),
                          std::regex("^(0|[1-9][0-9]{0,13})(\\.[0-9]{1,6})?$")))
      throw std::invalid_argument(
          "Module fees must be nonnegative decimal strings (14+6 digits).");
    for (auto k : {"startDate", "endDate", "nextRenewalDate"})
      date(v[k]);
    auto start = v["startDate"].isString() ? v["startDate"].asString() : "",
         end = v["endDate"].isString() ? v["endDate"].asString() : "";
    if (!start.empty() && !end.empty() && end < start)
      throw std::invalid_argument("Subscription end cannot precede start.");
    const auto cycle = v["billingCycle"].asString();
    if (cycle != "" && cycle != "monthly" && cycle != "quarterly" &&
        cycle != "annually" && cycle != "one_time")
      throw std::invalid_argument("Invalid billing cycle.");
  }
  auto &p = b["billing"];
  keys(p, {"currencyId", "email", "phone", "paymentMethod"});
  if (!p["currencyId"].isString() || !uuid(p["currencyId"].asString()))
    throw std::invalid_argument("Select an active billing currency; legacy fee "
                                "currency is not inferred.");
  text(p["email"], 254);
  text(p["phone"], 50);
  auto e = p["email"].asString();
  if (!e.empty() &&
      !std::regex_match(e, std::regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")))
    throw std::invalid_argument("Valid billing email required.");
  if (!p["paymentMethod"].isString() ||
      !std::set<std::string>{"unconfigured", "invoice", "bank_transfer",
                             "mobile_money", "card"}
           .count(p["paymentMethod"].asString()))
    throw std::invalid_argument("Invalid payment method.");
}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db, std::string op,
                                       std::string id, Json::Value b,
                                       utils::AuditIdentity who, bool host) {
  co_await db->execSqlCoro("SET LOCAL lock_timeout='5s'");
  const std::string actorTenant = host ? std::string{} : who.tenantId;
  auto actor = co_await db->execSqlCoro(
      "SELECT is_tenant_admin_user FROM users WHERE id=$1 AND is_deleted=false "
      "AND is_active=true AND is_locked_out=false AND is_host_admin_user=$2 "
      "AND (($2=true AND (tenant_id IS NULL OR "
      "tenant_id='00000000-0000-4000-8000-000000000001'::uuid)) OR "
      "tenant_id=NULLIF($3,'')::uuid) FOR SHARE",
      who.userId, host, actorTenant);
  // NULLIF avoids accepting a tenant identity in host mode and keeps UUID binds
  // valid.
  if (actor.empty())
    co_return fail("forbidden", "Live account administrator required.");
  if (!host && op != "entitlements" &&
      !actor[0]["is_tenant_admin_user"].as<bool>())
    co_return fail(
        "forbidden",
        "Tenant administrator required for account and billing details.");
  dto::BaseApiResponse out;
  if (op == "list") {
    auto search = b.get("search", "").asString();
    if (search.size() > 200)
      throw std::invalid_argument("Search too long.");
    auto rows = co_await db->execSqlCoro(
        select() +
            " AND ($1='' OR strpos(lower(t.name||' "
            "'||t.tenancy_name),lower($1))>0) ORDER BY t.name,t.id LIMIT 201",
        search);
    if (rows.size() > 200)
      co_return fail("validation_error",
                     "Narrow the search to at most 200 tenants.");
    out.result["items"] = Json::arrayValue;
    for (auto &r : rows)
      out.result["items"].append(parse(r["record"].as<std::string>()));
    out.success = true;
    co_return out;
  }
  if (!host)
    id = who.tenantId;
  auto locked = co_await db->execSqlCoro(
      "SELECT id FROM tenants WHERE id=$1 AND is_deleted=false AND ($2=true OR "
      "is_active=true) FOR UPDATE",
      id, host);
  if (locked.empty())
    co_return fail("not_found", "Tenant account not found.");
  auto before = co_await detail(db, id);
  if (op == "entitlements") {
    out.result["modules"] = Json::objectValue;
    for (auto m : modules)
      out.result["modules"][m] = before["modules"][m]["effective"];
    out.success = true;
    co_return out;
  }
  if (op == "update") {
    validate(b);
    if (before["version"] != b["version"])
      co_return fail("conflict", "Account changed. Reload before saving.");
    auto currency = co_await db->execSqlCoro(
        "SELECT id FROM core_currencies WHERE id=$1 AND is_deleted=false AND "
        "is_active=true FOR SHARE",
        b["billing"]["currencyId"].asString());
    if (currency.empty())
      throw std::invalid_argument("Select an active billing currency.");
    std::string sql =
        "UPDATE tenants SET "
        "name=$2::jsonb->>'name',country=$2::jsonb->>'country',is_active=($2::"
        "jsonb->>'isActive')::boolean,require_two_factor_auth=($2::jsonb->>'"
        "requireTwoFactorAuth')::boolean,last_modification_time=now(),last_"
        "modifier_user_id=$3";
    for (auto m : modules) {
      auto root = "$2::jsonb->'modules'->'" + m + "'";
      sql += ",has_subscribed_to_" + m + "=(" + root + "->>'enabled')::boolean";
      for (auto [column, key] :
           std::vector<std::pair<std::string, std::string>>{
               {"subscription_start_date", "startDate"},
               {"subscription_end_date", "endDate"},
               {"next_renewal_date", "nextRenewalDate"}})
        sql += "," + m + "_" + column + "=NULLIF(" + root + "->>'" + key +
               "','')::date";
      sql += "," + m + "_subscription_fee=(" + root + "->>'fee')::numeric," +
             m + "_billing_cycle=" + root + "->>'billingCycle'";
    }
    co_await db->execSqlCoro(sql + " WHERE id=$1 AND is_deleted=false", id,
                             json(b), who.userId);
    co_await db->execSqlCoro(
        "INSERT INTO "
        "core_tenant_billing_profiles(tenant_id,currency_id,email,phone,"
        "payment_method,created_by_user_id) "
        "VALUES($1,($2::jsonb->>'currencyId')::uuid,$2::jsonb->>'email',$2::"
        "jsonb->>'phone',$2::jsonb->>'paymentMethod',$3) ON "
        "CONFLICT(tenant_id) DO UPDATE SET "
        "currency_id=EXCLUDED.currency_id,email=EXCLUDED.email,phone=EXCLUDED."
        "phone,payment_method=EXCLUDED.payment_method,last_modified_at=now(),"
        "last_modified_by_user_id=$3,is_deleted=false",
        id, json(b["billing"]), who.userId);
    auto after = co_await detail(db, id);
    co_await db->execSqlCoro(
        "INSERT INTO "
        "core_tenant_account_events(tenant_id,action,actor_user_id,previous_"
        "state,state) VALUES($1,'account_updated',$2,$3::jsonb,$4::jsonb)",
        id, who.userId, json(before), json(after));
    out.result = after;
  } else if (op == "request") {
    keys(b, {"message", "requestKey"});
    text(b["message"], 1000, true);
    if (!b["requestKey"].isString() || !uuid(b["requestKey"].asString()))
      throw std::invalid_argument("Request UUID required.");
    auto duplicate = co_await db->execSqlCoro(
        "SELECT id,message,created_by_user_id FROM "
        "core_tenant_account_requests WHERE tenant_id=$1 AND request_key=$2 "
        "AND is_deleted=false",
        id, b["requestKey"].asString());
    if (!duplicate.empty()) {
      if (duplicate[0]["message"].as<std::string>() !=
              b["message"].asString() ||
          duplicate[0]["created_by_user_id"].as<std::string>() != who.userId)
        co_return fail("conflict", "Request key already used.");
    } else {
      co_await db->execSqlCoro(
          "INSERT INTO "
          "core_tenant_account_requests(tenant_id,request_key,message,created_"
          "by_user_id) VALUES($1,$2,$3,$4)",
          id, b["requestKey"].asString(), b["message"].asString(), who.userId);
      co_await db->execSqlCoro(
          "INSERT INTO "
          "core_tenant_account_events(tenant_id,action,actor_user_id,state) "
          "VALUES($1,'account_change_requested',$2,$3::jsonb)",
          id, who.userId, json(b));
    }
    out.result["accepted"] = true;
  } else if (op == "resolve") {
    keys(b, {"id", "version", "status", "response"});
    if (!b["id"].isString() || !uuid(b["id"].asString()) ||
        !b["version"].isInt() ||
        (b["status"] != "resolved" && b["status"] != "rejected"))
      throw std::invalid_argument(
          "Current request ID/version and resolution required.");
    text(b["response"], 1000, true);
    auto r = co_await db->execSqlCoro(
        "UPDATE core_tenant_account_requests SET "
        "status=$3,response=$4,last_modified_at=now(),last_modified_by_user_id="
        "$5,version=version+1 WHERE tenant_id=$1 AND id=$2 AND "
        "is_deleted=false AND status='open' AND version=$6 RETURNING id",
        id, b["id"].asString(), b["status"].asString(),
        b["response"].asString(), who.userId, b["version"].asInt());
    if (r.empty())
      co_return fail("conflict", "Request changed or already closed.");
    co_await db->execSqlCoro(
        "INSERT INTO "
        "core_tenant_account_events(tenant_id,action,actor_user_id,state) "
        "VALUES($1,'request_resolved',$2,$3::jsonb)",
        id, who.userId, json(b));
    out.result["resolved"] = true;
  } else if (op == "get")
    out.result = before;
  else
    co_return fail("validation_error", "Unsupported operation.");
  if (op == "get" || op == "update") {
    auto requests = co_await db->execSqlCoro(
        "SELECT "
        "jsonb_build_object('id',id,'message',message,'response',response,'"
        "status',status,'version',version,'createdAt',created_at)::text record "
        "FROM core_tenant_account_requests WHERE tenant_id=$1 AND "
        "is_deleted=false ORDER BY created_at DESC,id LIMIT 100",
        id);
    out.result["requests"] = Json::arrayValue;
    for (auto &r : requests)
      out.result["requests"].append(parse(r["record"].as<std::string>()));
    if (host) {
      auto events = co_await db->execSqlCoro(
          "SELECT "
          "jsonb_build_object('id',id,'action',action,'actorUserId',actor_user_"
          "id,'createdAt',created_at,'previous',previous_state,'state',state)::"
          "text record FROM core_tenant_account_events WHERE tenant_id=$1 AND "
          "is_deleted=false ORDER BY created_at DESC,id LIMIT 100",
          id);
      out.result["audit"] = Json::arrayValue;
      for (auto &r : events)
        out.result["audit"].append(parse(r["record"].as<std::string>()));
    }
  }
  out.success = true;
  co_return out;
}
} // namespace
std::string TenantAccountService::moduleForPath(const std::string &p) {
  for (auto [path, m] : std::vector<std::pair<std::string, std::string>>{
           {"ledger", "gl"},
           {"payroll", "payroll"},
           {"hr", "human_resource"},
           {"school", "school_manager"},
           {"ap", "ap"},
           {"ar", "ar"},
           {"inventory", "inventory"},
           {"manufacturing", "manufacturing"},
           {"pos", "point_of_sale"},
           {"fixed-assets", "fixed_assets"},
           {"supply-chain", "supply_chain"},
           {"property-rentals", "property_rentals"},
           {"document-management", "document_management"},
           {"core-banking", "core_banking"}}) {
    auto prefix = "/api/v1/" + path;
    if (p == prefix || p.starts_with(prefix + "/"))
      return m;
  }
  return "";
}
drogon::Task<bool> TenantAccountService::moduleAllowed(std::string tenant,
                                                       std::string module) {
  if (!uuid(tenant) ||
      std::find(modules.begin(), modules.end(), module) == modules.end())
    co_return false;
  auto r = co_await drogon::app().getDbClient()->execSqlCoro(
      "SELECT id FROM tenants WHERE id=$1 AND is_deleted=false AND "
      "is_active=true AND has_subscribed_to_" +
          module + "=true AND (" + module +
          "_subscription_start_date IS NULL OR " + module +
          "_subscription_start_date::date<=CURRENT_DATE) AND (" + module +
          "_subscription_end_date IS NULL OR " + module +
          "_subscription_end_date::date>=CURRENT_DATE)",
      tenant);
  co_return !r.empty();
}
drogon::Task<dto::BaseApiResponse>
TenantAccountService::execute(std::string op, std::string id, Json::Value b,
                              utils::AuditIdentity who, bool host) {
  if (!uuid(who.userId) || (host ? !who.tenantId.empty() : !uuid(who.tenantId)))
    co_return fail("unauthorized", "Correctly scoped authentication required.");
  if ((!host && op != "get" && op != "request" && op != "entitlements") ||
      (host && op != "list" && op != "get" && op != "update" &&
       op != "resolve"))
    co_return fail("forbidden", "This account operation is not permitted.");
  if (host && id == "00000000-0000-4000-8000-000000000001")
    co_return fail("forbidden",
                   "The protected host account is not a customer tenant.");
  if (host && op != "list" && !uuid(id))
    co_return fail("validation_error", "Tenant UUID required.");
  try {
    auto db = drogon::app().getDbClient();
    auto ready = co_await db->execSqlCoro(
        "SELECT to_regclass('core_tenant_account_events') IS NOT NULL AS "
        "ready");
    if (!ready[0]["ready"].as<bool>())
      co_return fail("schema_not_ready",
                     "Apply migration 018_tenant_accounts.sql.");
    auto tx = co_await db->newTransactionCoro();
    dto::BaseApiResponse out;
    try {
      out = co_await run(tx, op, id, b, who, host);
    } catch (...) {
      tx->rollback();
      throw;
    }
    if (!out.success) {
      tx->rollback();
      co_return out;
    }
    if (!(co_await utils::CommitTransaction{std::move(tx)}))
      co_return fail("database_error",
                     "Account changes could not be committed.");
    co_return out;
  } catch (const std::invalid_argument &e) {
    co_return fail("validation_error", e.what());
  } catch (const std::exception &) {
    co_return fail("database_error", "Account service unavailable.");
  }
}
} // namespace business_desk::domain_services
