// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport
// seam.
#include "domain_services/tenants/TenantAccountService.h"

#include <cassert>
#include <drogon/orm/CoroMapper.h>

#include <algorithm>
#include <cctype>
#include <fstream>
#include <iostream>
#include <sstream>
// Stable libpq C ABI subset: avoids requiring distro libpq development headers.
extern "C" {
struct pg_conn;
struct pg_result;
pg_conn *PQconnectdb(const char *);
void PQfinish(pg_conn *);
int PQstatus(const pg_conn *);
pg_result *PQexecParams(pg_conn *, const char *, int, const unsigned int *,
                        const char *const *, const int *, const int *, int);
int PQresultStatus(const pg_result *);
char *PQresultErrorMessage(const pg_result *);
char *PQresultErrorField(const pg_result *, int);
int PQntuples(const pg_result *);
int PQnfields(const pg_result *);
char *PQfname(const pg_result *, int);
char *PQgetvalue(const pg_result *, int, int);
int PQgetisnull(const pg_result *, int, int);
unsigned int PQftype(const pg_result *, int);
void PQclear(pg_result *);
}
using business_desk::domain_services::TenantAccountService;
using business_desk::utils::AuditIdentity;
const std::string tenant = "10000000-0000-4000-8000-000000000001",
                  other = "10000000-0000-4000-8000-000000000002",
                  actor = "20000000-0000-4000-8000-000000000001",
                  actor2 = "20000000-0000-4000-8000-000000000002";
int checks = 0;
void check(bool value, const char *label) {
  if (!value)
    throw std::runtime_error(label);
  ++checks;
}
int main() {
  auto *db = PQconnectdb(std::getenv("ACCOUNT_TEST_DATABASE_URL"));
  assert(PQstatus(db) == 0);
  auto sql = [&](const std::string &query,
                 const std::vector<Json::Value> &params =
                     std::vector<Json::Value>{}) {
    std::vector<std::string> strings;
    for (const auto &p : params)
      strings.push_back(p.isString() ? p.asString() : p.toStyledString());
    const auto widths = std::exchange(drogon::testParameterWidths, {});
    std::vector<int> lengths(params.size(), 0), formats(params.size(), 0);
    for (size_t i = 0; i < params.size() && i < widths.size(); ++i)
      if (widths[i]) {
        lengths[i] = widths[i];
        formats[i] = 1;
        strings[i].resize(widths[i]);
        const auto number = params[i].asInt64();
        for (int byte = 0; byte < widths[i]; ++byte)
          strings[i][byte] = static_cast<char>(
              (static_cast<uint64_t>(number) >> (8 * (widths[i] - 1 - byte))) &
              255);
      }
    std::vector<const char *> values;
    for (const auto &s : strings)
      values.push_back(s.c_str());
    auto *result =
        PQexecParams(db, query.c_str(), values.size(), nullptr, values.data(),
                     lengths.data(), formats.data(), 0);
    auto status = PQresultStatus(result);
    if (status != 1 && status != 2) {
      std::string error = PQresultErrorMessage(result);
      const char *code = PQresultErrorField(result, 'C');
      std::cerr << query << "\n" << error << std::endl;
      bool unique = code && std::string(code) == "23505";
      PQclear(result);
      if (unique)
        throw drogon::orm::UniqueViolation(error);
      throw std::runtime_error(error);
    }
    drogon::TestResult rows;
    for (int row = 0; row < PQntuples(result); ++row) {
      Json::Value value;
      for (int col = 0; col < PQnfields(result); ++col) {
        const char *k = PQfname(result, col);
        if (PQgetisnull(result, row, col))
          value[k] = Json::nullValue;
        else if ((PQftype(result, col) == 20 || PQftype(result, col) == 23 ||
                  PQftype(result, col) == 21))
          value[k] = Json::Int64(std::stoll(PQgetvalue(result, row, col)));
        else if (PQftype(result, col) == 16)
          value[k] = std::string(PQgetvalue(result, row, col)) == "t";
        else
          value[k] = PQgetvalue(result, row, col);
      }
      rows.push_back({value});
    }
    PQclear(result);
    return rows;
  };
  sql("SET search_path TO accounts_test");
  drogon::app().getDbClient()->execute = sql;
  const std::string host = "20000000-0000-4000-8000-000000000009",
                    currency = "40000000-0000-4000-8000-000000000001";
  sql("INSERT INTO "
      "tenants(id,tenancy_name,name,connection_string,account_secret,account_"
      "id) "
      "VALUES($1,'acme','Acme','SECRET_CONNECTION','SECRET_ACCOUNT','SECRET_"
      "PROVIDER'),($2,'other','Other','OTHER_CONNECTION','OTHER_SECRET','OTHER_"
      "PROVIDER')",
      {tenant, other});
  sql("INSERT INTO users(id,tenant_id,is_tenant_admin_user) "
      "VALUES($1,$3,true),($2,$3,false)",
      {actor, actor2, tenant});
  sql("INSERT INTO users(id,is_host_admin_user) VALUES($1,true)", {host});
  sql("INSERT INTO core_currencies(id,code) VALUES($1,'GHS')", {currency});
  auto call =
      [&](std::string op, std::string id = "", Json::Value body = Json::Value{},
          AuditIdentity who = {"", "20000000-0000-4000-8000-000000000009"},
          bool h = true) {
        auto r = TenantAccountService::execute(op, id, body, who, h).get();
        return r;
      };
  auto get = call("get", tenant);
  if (!get.success)
    std::cerr << get.toJson() << std::endl;
  check(get.success, "host account projection");
  check(get.result["modules"].size() == 14,
        "all 14 legacy module subscriptions");
  check(get.toJson().toStyledString().find("SECRET") == std::string::npos,
        "safe whitelist excludes connection/account/provider secrets");
  check(call("list").result["items"].size() == 2, "host register");
  check(!call("get", tenant, {}, {}, true).success, "anonymous denied");
  check(!call("get", tenant, {}, {tenant, actor}, true).success,
        "tenant cannot claim host scope");
  check(!call("get", tenant, {}, {tenant, actor2}, false).success,
        "nonadmin cannot read billing");
  auto self = call("get", other, {}, {tenant, actor}, false);
  check(self.success && self.result["id"] == tenant,
        "self scope server-derived, arbitrary supplied ID ignored");
  check(!call("update", tenant, {}, {tenant, actor}, false).success,
        "tenant cannot change fees/dates/flags");
  auto body = get.result;
  for (auto k :
       {"id", "accountId", "createdAt", "updatedAt", "audit", "requests"})
    body.removeMember(k);
  for (auto m : body["modules"].getMemberNames())
    body["modules"][m].removeMember("effective");
  body["billing"].removeMember("currencyCode");
  body["billing"]["currencyId"] = currency;
  body["billing"]["email"] = "billing@example.test";
  body["modules"]["gl"]["enabled"] = true;
  body["modules"]["gl"]["fee"] = "125.123456";
  body["modules"]["gl"]["billingCycle"] = "monthly";
  auto saved = call("update", tenant, body);
  if (!saved.success)
    std::cerr << saved.toJson() << std::endl;
  check(saved.success && saved.result["version"].asInt() == 2,
        "host update and optimistic version");
  check(saved.result["modules"]["gl"]["fee"] == "125.123456",
        "exact decimal fee");
  check(saved.result["billing"]["currencyCode"] == "GHS" &&
            saved.result["audit"].size() == 1,
        "billing currency and audit committed");
  check(!call("update", tenant, body).success, "stale update rejected");
  check(TenantAccountService::moduleAllowed(tenant, "gl").get(),
        "enabled unbounded subscription grants access");
  check(!TenantAccountService::moduleAllowed(tenant, "payroll").get(),
        "disabled module denied");
  check(!TenantAccountService::moduleAllowed(tenant, "gl;DROP TABLE tenants")
             .get(),
        "module allowlist prevents identifier injection");
  sql("UPDATE tenants SET gl_subscription_end_date=CURRENT_DATE-1 WHERE id=$1",
      {tenant});
  check(!TenantAccountService::moduleAllowed(tenant, "gl").get(),
        "expired subscription denied");
  sql("UPDATE tenants SET "
      "gl_subscription_end_date=CURRENT_DATE,gl_subscription_start_date="
      "CURRENT_DATE WHERE id=$1",
      {tenant});
  check(TenantAccountService::moduleAllowed(tenant, "gl").get(),
        "start and end inclusive");
  sql("UPDATE tenants SET "
      "gl_subscription_start_date=CURRENT_DATE+1,gl_subscription_end_date=NULL "
      "WHERE id=$1",
      {tenant});
  check(!TenantAccountService::moduleAllowed(tenant, "gl").get(),
        "future subscription denied");
  sql("UPDATE tenants SET gl_subscription_start_date=NULL WHERE id=$1",
      {tenant});
  auto ent = call("entitlements", "", {}, {tenant, actor2}, false);
  check(ent.success && ent.result["modules"]["gl"].asBool() &&
            !ent.result.isMember("billing"),
        "ordinary user receives entitlements only, not commercial details");
  check(
      TenantAccountService::moduleForPath("/api/v1/ledger/journals") == "gl" &&
          TenantAccountService::moduleForPath("/api/v1/ledger-evil").empty() &&
          TenantAccountService::moduleForPath("/api/v1/account").empty(),
      "route module mapping has segment boundaries and account exemption");
  Json::Value request;
  request["message"] = "Please add Payroll";
  request["requestKey"] = "60000000-0000-4000-8000-000000000001";
  check(call("request", "", request, {tenant, actor}, false).success,
        "admin change request");
  check(call("request", "", request, {tenant, actor}, false).success,
        "request idempotent retry");
  auto account = call("get", tenant).result;
  check(account["requests"].size() == 1, "no duplicate requests");
  check(!call("request", "", request, {tenant, actor2}, false).success,
        "ordinary user cannot request billing changes");
  auto item = account["requests"][0];
  Json::Value resolve;
  resolve["id"] = item["id"];
  resolve["version"] = item["version"];
  resolve["status"] = "resolved";
  resolve["response"] = "Approved; terms updated separately";
  check(call("resolve", tenant, resolve).success, "host can resolve request");
  check(!call("resolve", tenant, resolve).success,
        "stale/closed resolution rejected");
  check(!call("resolve", other, resolve).success,
        "request cross-tenant isolation");
  body["version"] = call("get", tenant).result["version"];
  auto bad = body;
  bad["accountSecret"] = "SPOOF";
  check(!call("update", tenant, bad).success, "unknown secret fields rejected");
  bad = body;
  bad["modules"]["gl"]["fee"] = "1e4";
  check(!call("update", tenant, bad).success, "nondecimal fee rejected");
  bad = body;
  bad["modules"]["gl"]["startDate"] = "2026-02-30";
  check(!call("update", tenant, bad).success, "invalid calendar date rejected");
  bad = body;
  bad["modules"]["gl"]["startDate"] = "2026-10-22";
  bad["modules"]["gl"]["endDate"] = "2026-10-21";
  check(!call("update", tenant, bad).success, "inverted date range rejected");
  auto before = call("get", tenant).result;
  drogon::TestTransaction::failCommit = true;
  auto failed = call("update", tenant, body);
  drogon::TestTransaction::failCommit = false;
  check(!failed.success && call("get", tenant).result == before,
        "commit failure rolls back profile, fees, version and audit");
  sql("UPDATE tenants SET is_active=false WHERE id=$1", {tenant});
  check(!TenantAccountService::moduleAllowed(tenant, "gl").get() &&
            !call("get", "", {}, {tenant, actor}, false).success,
        "suspension blocks tenant account and module access");
  check(call("get", tenant).success, "host can manage suspended account");
  sql("UPDATE users SET is_active=false WHERE id=$1", {host});
  check(!call("get", tenant).success, "revoked host blocked");
  std::cout << checks << " tenant account PostgreSQL checks passed\n";
  PQfinish(db);
}
