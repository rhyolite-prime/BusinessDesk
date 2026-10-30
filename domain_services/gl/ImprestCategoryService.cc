#include "ImprestCategoryService.h"
#include "utils/TransactionUtil.h"
#include <regex>
namespace business_desk::domain_services {
namespace {
using drogon::orm::DbClientPtr;
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
Json::Value record(const drogon::orm::Row &row) {
  Json::Value r;
  r["id"] = row["id"].as<std::string>();
  r["name"] = row["name"].as<std::string>();
  r["accountingUnitId"] = row["accounting_unit_id"].as<std::string>();
  r["version"] = row["version"].as<int>();
  return r;
}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db, std::string op,
                                       std::string id, Json::Value b,
                                       utils::AuditIdentity who) {
  const bool write = op != "list" && op != "get";
  auto actor = co_await db->execSqlCoro(
      "SELECT u.id FROM users u JOIN tenants t ON t.id=u.tenant_id AND "
      "t.is_deleted=false AND t.is_active=true WHERE u.id=$1 AND "
      "u.tenant_id=$2 AND u.is_deleted=false AND u.is_active=true AND "
      "u.is_locked_out=false AND u.is_host_admin_user=false",
      who.userId, who.tenantId);
  if (actor.empty())
    co_return fail("forbidden", "Live tenant user required.");
  if (write) {
    co_await db->execSqlCoro("SET LOCAL lock_timeout='5s'");
    co_await db->execSqlCoro("SET LOCAL statement_timeout='15s'");
  }
  dto::BaseApiResponse r;
  if (op == "list" || op == "create") {
    auto units = co_await db->execSqlCoro(
        "SELECT id FROM core_accounting_units WHERE id=$1 AND tenant_id=$2 AND "
        "is_deleted=false AND is_active=true" +
            std::string(write ? " FOR SHARE" : ""),
        b["accountingUnitId"].asString(), who.tenantId);
    if (units.empty())
      co_return fail("validation_error",
                     "Select a live accounting unit in this tenant.");
  }
  if (op == "list") {
    auto rows = co_await db->execSqlCoro(
        "SELECT * FROM gl_imprest_categories WHERE tenant_id=$1 AND "
        "accounting_unit_id=$2 AND is_deleted=false ORDER BY lower(name),id",
        who.tenantId, b["accountingUnitId"].asString());
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(record(row));
    r.result["totalCount"] = Json::UInt64(rows.size());
  } else {
    if (op != "create") {
      auto rows = co_await db->execSqlCoro(
          "SELECT * FROM gl_imprest_categories WHERE tenant_id=$1 AND id=$2 "
          "AND is_deleted=false" +
              std::string(write ? " FOR UPDATE" : ""),
          who.tenantId, id);
      if (rows.empty())
        co_return fail("not_found", "Imprest category not found.");
      if (op == "get") {
        r.success = true;
        r.result = record(rows[0]);
        co_return r;
      }
      if (rows[0]["version"].as<int>() != b["version"].asInt())
        co_return fail("conflict", "Category changed. Reload before retrying.");
    }
    if (op == "delete") {
      auto refs = co_await db->execSqlCoro(
          "SELECT id FROM gl_imprests WHERE tenant_id=$1 AND "
          "imprest_category_id=$2 AND is_deleted=false UNION ALL SELECT id "
          "FROM gl_default_accounts WHERE tenant_id=$1 AND "
          "imprest_category_id=$2 AND is_deleted=false LIMIT 1",
          who.tenantId, id);
      if (!refs.empty())
        co_return fail(
            "conflict",
            "Category is referenced by an imprest or default GL mapping.");
      co_await db->execSqlCoro(
          "UPDATE gl_imprest_categories SET "
          "is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,last_"
          "modified_at=now(),last_modified_by_user_id=$3,version=version+1 "
          "WHERE tenant_id=$1 AND id=$2 AND is_deleted=false",
          who.tenantId, id, who.userId);
      r.result["id"] = id;
      r.result["isDeleted"] = true;
    } else if (op == "create") {
      auto rows = co_await db->execSqlCoro(
          "INSERT INTO "
          "gl_imprest_categories(tenant_id,accounting_unit_id,name,created_by_"
          "user_id) VALUES($1,$2,$3,$4) RETURNING *",
          who.tenantId, b["accountingUnitId"].asString(), b["name"].asString(),
          who.userId);
      r.result = record(rows[0]);
    } else {
      auto rows = co_await db->execSqlCoro(
          "UPDATE gl_imprest_categories SET "
          "name=$3,last_modified_at=now(),last_modified_by_user_id=$4,version="
          "version+1 WHERE tenant_id=$1 AND id=$2 AND is_deleted=false "
          "RETURNING *",
          who.tenantId, id, b["name"].asString(), who.userId);
      r.result = record(rows[0]);
    }
  }
  r.success = true;
  co_return r;
}
} // namespace
drogon::Task<dto::BaseApiResponse>
ImprestCategoryService::execute(std::string op, std::string id, Json::Value b,
                                utils::AuditIdentity who) {
  if (!uuid(who.tenantId) || !uuid(who.userId))
    co_return fail("unauthorized", "Tenant authentication required.");
  if (op != "list" && op != "get" && op != "create" && op != "update" &&
      op != "delete")
    co_return fail("validation_error", "Invalid operation.");
  if (op != "list" && op != "create" && !uuid(id))
    co_return fail("validation_error", "Invalid category ID.");
  if ((op == "list" || op == "create") && !b.isObject())
    co_return fail("validation_error", "Provide category fields.");
  if (op == "list" || op == "create")
    if (!b["accountingUnitId"].isString() ||
        !uuid(b["accountingUnitId"].asString()))
      co_return fail("validation_error", "Select an accounting unit.");
  if (op == "create" || op == "update" || op == "delete") {
    if (!b.isObject())
      co_return fail("validation_error", "Provide category fields.");
    for (const auto &k : b.getMemberNames())
      if (!((k == "name" && op != "delete") ||
            (k == "accountingUnitId" && op == "create") ||
            (k == "version" && op != "create")))
        co_return fail("validation_error", "Unknown or server-owned field.");
    if (op != "create" && (!b["version"].isInt() || b["version"].asInt() < 1 ||
                           b["version"].asInt() == 2147483647))
      co_return fail("validation_error", "Current version required.");
    if (op != "delete") {
      if (!b["name"].isString())
        co_return fail("validation_error", "Name required.");
      auto s = b["name"].asString();
      auto a = s.find_first_not_of(" \t\r\n"),
           z = s.find_last_not_of(" \t\r\n");
      if (a == std::string::npos)
        co_return fail("validation_error", "Name required.");
      s = s.substr(a, z - a + 1);
      if (s.size() > 160 || s.find('\0') != s.npos)
        co_return fail("validation_error", "Name must contain 1–160 bytes.");
      b["name"] = s;
    }
  }
  try {
    auto db = drogon::app().getDbClient();
    if (op == "list" || op == "get")
      co_return co_await run(db, op, id, b, who);
    auto tx = co_await db->newTransactionCoro();
    auto r = co_await run(tx, op, id, b, who);
    if (!r.success) {
      tx->rollback();
      co_return r;
    }
    if (!(co_await utils::CommitTransaction{std::move(tx)}))
      co_return fail("database_error", "Unable to commit category changes.");
    co_return r;
  } catch (const drogon::orm::UniqueViolation &) {
    co_return fail("conflict", "Category name already exists in this unit.");
  } catch (const std::exception &) {
    co_return fail(
        "database_error",
        "Category service unavailable. Apply migration 024 and retry.");
  }
}
} // namespace business_desk::domain_services
