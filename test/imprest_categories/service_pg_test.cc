// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport
// seam.
#include "domain_services/gl/ImprestCategoryService.h"
#include <algorithm>
#include <cassert>
#include <cctype>
#include <drogon/orm/CoroMapper.h>
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
using business_desk::domain_services::ImprestCategoryService;
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
  auto *db = PQconnectdb(std::getenv("IMPREST_TEST_DATABASE_URL"));
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
  sql("DROP SCHEMA IF EXISTS imprest_test CASCADE");
  sql("CREATE SCHEMA imprest_test");
  sql("SET search_path TO imprest_test");
  sql("CREATE TABLE tenants(id uuid PRIMARY KEY,is_deleted boolean DEFAULT "
      "false,is_active boolean DEFAULT true)");
  sql("CREATE TABLE users(id uuid PRIMARY KEY,tenant_id uuid,is_deleted "
      "boolean DEFAULT false,is_active boolean DEFAULT true,is_locked_out "
      "boolean DEFAULT false,is_host_admin_user boolean DEFAULT false)");
  sql("CREATE TABLE core_accounting_units(id uuid PRIMARY KEY,tenant_id "
      "uuid,is_deleted boolean DEFAULT false,is_active boolean DEFAULT true)");
  sql("CREATE TABLE gl_imprest_categories(id uuid PRIMARY KEY DEFAULT "
      "gen_random_uuid(),tenant_id uuid NOT NULL,accounting_unit_id uuid NOT "
      "NULL REFERENCES core_accounting_units(id),name varchar(160) NOT "
      "NULL,created_at timestamptz DEFAULT now(),created_by_user_id "
      "uuid,last_modified_at timestamptz,last_modified_by_user_id "
      "uuid,is_deleted boolean DEFAULT false,deleted_at "
      "timestamptz,deleted_by_user_id uuid,CONSTRAINT "
      "uq_gl_imprest_categories_tenant_unit_name "
      "UNIQUE(tenant_id,accounting_unit_id,name))");
  for (auto table : {"gl_imprests", "gl_default_accounts"})
    sql("CREATE TABLE " + std::string(table) +
        "(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id "
        "uuid,accounting_unit_id uuid,imprest_category_id uuid REFERENCES "
        "gl_imprest_categories(id),is_deleted boolean DEFAULT false)");
  auto migration = [&](const char *suffix) {
    std::ifstream f(std::string("database/migrations/024_imprest_categories") +
                    suffix);
    std::stringstream content;
    content << f.rdbuf();
    auto text = content.str();
    size_t start = 0;
    bool dollar = false;
    for (size_t i = 0; i < text.size(); ++i) {
      if (text.substr(i, 2) == "$$") {
        dollar = !dollar;
        ++i;
      } else if (text[i] == ';' && !dollar) {
        sql(text.substr(start, i - start));
        start = i + 1;
      }
    }
  };
  migration(".sql");
  migration(".down.sql");
  migration(".sql");
  check(true, "migration up/down/up");
  const std::string unit = "30000000-0000-4000-8000-000000000001",
                    unit2 = "30000000-0000-4000-8000-000000000002",
                    foreignUnit = "30000000-0000-4000-8000-000000000003";
  sql("INSERT INTO tenants(id) VALUES($1),($2)", {tenant, other});
  sql("INSERT INTO users(id,tenant_id) VALUES($1,$2),($3,$4)",
      {actor, tenant, actor2, other});
  sql("INSERT INTO core_accounting_units(id,tenant_id) "
      "VALUES($1,$2),($3,$2),($4,$5)",
      {unit, tenant, unit2, foreignUnit, other});
  drogon::app().getDbClient()->execute = sql;
  auto input = [&](std::string name) {
    Json::Value b;
    b["name"] = name;
    b["accountingUnitId"] = unit;
    return b;
  };
  auto call = [&](std::string op, std::string id = "",
                  Json::Value b = Json::Value{},
                  AuditIdentity who = AuditIdentity{tenant, actor}) {
    return ImprestCategoryService::execute(op, id, b, who).get();
  };
  Json::Value list;
  list["accountingUnitId"] = unit;
  check(!call("list", "", list, {}).success, "anonymous denied");
  check(!call("create", "", input("Travel"), {other, actor}).success,
        "actor tenant verified");
  for (const auto &bad :
       {Json::Value("invalid"), Json::Value(2), Json::Value(Json::arrayValue)})
    check(!call("create", "", bad).success, "nonobject bodies rejected");
  sql("UPDATE users SET is_locked_out=true WHERE id=$1 AND is_deleted=false",
      {actor});
  check(call("list", "", list).error["code"] == "forbidden",
        "locked actor denied");
  sql("UPDATE users SET is_locked_out=false WHERE id=$1 AND is_deleted=false",
      {actor});
  sql("UPDATE core_accounting_units SET is_active=false WHERE id=$1 AND "
      "is_deleted=false",
      {unit});
  check(!call("create", "", input("Inactive")).success, "inactive unit denied");
  sql("UPDATE core_accounting_units SET is_active=true WHERE id=$1 AND "
      "is_deleted=false",
      {unit});
  auto created = call("create", "", input(" Travel "));
  check(created.success, "create");
  auto id = created.result["id"].asString();
  check(created.result["name"] == "Travel" && created.result["version"] == 1,
        "trim and initial version");
  check(sql("SELECT created_by_user_id FROM gl_imprest_categories WHERE id=$1 "
            "AND is_deleted=false",
            {id})[0]
                .value["created_by_user_id"] == actor,
        "server audit");
  check(call("list", "", list).result["data"].size() == 1, "unit list");
  check(call("get", id).success, "get");
  check(call("get", id, {}, {other, actor2}).error["code"] == "not_found",
        "foreign category hidden");
  auto foreign = input("Foreign");
  foreign["accountingUnitId"] = foreignUnit;
  check(!call("create", "", foreign).success, "foreign unit rejected");
  check(call("create", "", input("travel")).error["code"] == "conflict",
        "casefold uniqueness");
  for (auto name : {"", "   "})
    check(!call("create", "", input(name)).success, "empty name rejected");
  check(!call("create", "", input(std::string(161, 'x'))).success,
        "length rejected");
  auto spoof = input("Spoof");
  spoof["tenantId"] = other;
  check(!call("create", "", spoof).success, "scope spoof denied");
  Json::Value edit;
  edit["name"] = "Operations";
  edit["version"] = 1;
  auto updated = call("update", id, edit);
  check(updated.success && updated.result["version"] == 2,
        "update increments version");
  for (auto op : {"update", "delete"}) {
    Json::Value foreignBody;
    foreignBody["version"] = 2;
    if (std::string(op) == "update")
      foreignBody["name"] = "Foreign";
    check(call(op, id, foreignBody, {other, actor2}).error["code"] ==
              "not_found",
          "foreign writes hidden");
  }
  check(call("update", id, edit).error["code"] == "conflict",
        "stale update rejected");
  Json::Value del;
  del["version"] = 1;
  check(call("delete", id, del).error["code"] == "conflict",
        "stale delete rejected");
  del["version"] = 2;
  for (auto table : {"gl_imprests", "gl_default_accounts"}) {
    sql("INSERT INTO " + std::string(table) +
            "(tenant_id,accounting_unit_id,imprest_category_id) "
            "VALUES($1,$2,$3)",
        {tenant, unit, id});
    check(call("delete", id, del).error["code"] == "conflict",
          "live references prevent deletion");
    sql("UPDATE " + std::string(table) +
            " SET is_deleted=true WHERE tenant_id=$1 AND is_deleted=false",
        {tenant});
  }
  check(call("delete", id, del).success, "soft delete");
  check(!call("get", id).success &&
            call("list", "", list).result["data"].empty(),
        "archived excluded");
  check(sql("SELECT deleted_by_user_id FROM gl_imprest_categories WHERE id=$1",
            {id})[0]
                .value["deleted_by_user_id"] == actor,
        "delete auditing");
  check(call("create", "", input("operations")).success,
        "archived name can be reused");
  auto replacement = call("list", "", list).result["data"][0]["id"].asString();
  auto second = input("operations");
  second["accountingUnitId"] = unit2;
  check(call("create", "", second).success,
        "same name in another unit allowed");
  for (auto table : {"gl_imprests", "gl_default_accounts"}) {
    for (auto wrongUnit : {unit2, foreignUnit}) {
      bool rejected = false;
      try {
        sql("INSERT INTO " + std::string(table) +
                "(tenant_id,accounting_unit_id,imprest_category_id) "
                "VALUES($1,$2,$3)",
            {tenant, wrongUnit, replacement});
      } catch (...) {
        rejected = true;
      }
      check(rejected, "reference unit mismatch rejected");
    }
  }
  for (const auto &t : {"gl_imprests", "gl_default_accounts"}) {
    bool rejected = false;
    try {
      sql("INSERT INTO " + std::string(t) +
              "(tenant_id,accounting_unit_id,imprest_category_id) "
              "VALUES($1,$2,$3)",
          {tenant, unit, id});
    } catch (...) {
      rejected = true;
    }
    check(rejected, "SQL rejects archived category references");
  }
  drogon::TestTransaction::failCommit = true;
  check(!call("create", "", input("Rollback")).success,
        "failed commit reported");
  drogon::TestTransaction::failCommit = false;
  check(call("list", "", list).result["data"].size() == 1,
        "failed commit rolls back");
  std::cout << checks << " imprest category PostgreSQL checks passed\n";
  PQfinish(db);
}
