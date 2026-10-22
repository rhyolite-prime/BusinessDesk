#include "CustomerService.h"
#include "utils/TransactionUtil.h"
#include <drogon/orm/CoroMapper.h>
#include <regex>
#include <set>
namespace business_desk::domain_services {
namespace {
dto::BaseApiResponse fail(const char *code, const char *message) {
  dto::BaseApiResponse r;
  r.error["code"] = code;
  r.error["message"] = message;
  return r;
}
bool uuid(const std::string &s) {
  return std::regex_match(
             s, std::regex(
                    "^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$")) &&
         s != "00000000-0000-0000-0000-000000000000";
}
void text(Json::Value &v, size_t max) {
  if (!v.isString())
    throw std::invalid_argument("Text required.");
  auto s = v.asString();
  auto a = s.find_first_not_of(" \r\n\t"), b = s.find_last_not_of(" \r\n\t");
  if (a == s.npos)
    throw std::invalid_argument("Name and customer number required.");
  s = s.substr(a, b - a + 1);
  if (s.size() > max || s.find('\0') != s.npos)
    throw std::invalid_argument("Text is too long.");
  v = s;
}
std::string projection() {
  return "SELECT "
         "jsonb_build_object('id',c.id,'accountNumber',c.account_number,'name',"
         "c.name,'accountingUnitId',c.accounting_unit_id,'receivableAccountId',"
         "c.receivable_account_id,'currencyId',c.currency_id,'currencyCode',q."
         "code,'isActive',c.is_active,'version',c.version)::text record FROM "
         "core_customers c JOIN core_currencies q ON q.id=c.currency_id AND "
         "q.is_deleted=false WHERE c.tenant_id=$1 AND c.is_deleted=false";
}
Json::Value record(const drogon::orm::Row &r) {
  Json::Value v;
  Json::Reader reader;
  if (!reader.parse(r["record"].as<std::string>(), v))
    throw std::runtime_error("Invalid customer record");
  return v;
}
} // namespace
drogon::Task<dto::BaseApiResponse>
CustomerService::execute(std::string op, std::string id, Json::Value body,
                         utils::AuditIdentity who) {
  if (!uuid(who.tenantId) || !uuid(who.userId))
    co_return fail("unauthorized", "Tenant sign-in required.");
  try {
    if (op != "list" && op != "create" && op != "update" && op != "delete")
      co_return fail("validation_error", "Unsupported operation.");
    if ((op == "update" || op == "delete") && !uuid(id))
      co_return fail("validation_error", "Valid customer ID required.");
    auto db = drogon::app().getDbClient();
    auto schema = co_await db->execSqlCoro(
        "SELECT to_regclass('core_customers') IS NOT NULL ready");
    if (!schema[0]["ready"].as<bool>())
      co_return fail("schema_not_ready",
                     "Apply migration 020_customer_receipts.sql.");
    auto tx = co_await db->newTransactionCoro();
    dto::BaseApiResponse result;
    try {
      auto actor = co_await tx->execSqlCoro(
          "SELECT u.is_tenant_admin_user FROM users u JOIN tenants t ON "
          "t.id=u.tenant_id WHERE u.id=$1 AND u.tenant_id=$2 AND "
          "u.is_deleted=false AND u.is_active=true AND u.is_locked_out=false "
          "AND u.is_host_admin_user=false AND t.is_deleted=false AND "
          "t.is_active=true FOR SHARE OF u,t",
          who.userId, who.tenantId);
      if (actor.empty()) {
        tx->rollback();
        co_return fail("forbidden", "Live tenant user required.");
      }
      if (op == "list") {
        int page = body.get("pageNo", 1).asInt(),
            size = body.get("pageSize", 100).asInt();
        if (page < 1 || page > 100000 || size < 1 || size > 100)
          throw std::invalid_argument("Invalid pagination.");
        auto rows = co_await tx->execSqlCoro(
            projection() +
                " ORDER BY lower(c.name),c.id LIMIT $2::int OFFSET $3::int",
            who.tenantId, size, (page - 1) * size);
        auto n = co_await tx->execSqlCoro(
            "SELECT count(*)::int n FROM core_customers c JOIN core_currencies "
            "q ON q.id=c.currency_id AND q.is_deleted=false WHERE "
            "c.tenant_id=$1 AND c.is_deleted=false",
            who.tenantId);
        result.result["data"] = Json::arrayValue;
        for (auto &r : rows)
          result.result["data"].append(record(r));
        int total = n[0]["n"].as<int>();
        result.result["totalCount"] = total;
        result.result["totalPages"] = (total + size - 1) / size;
      } else {
        if (!actor[0]["is_tenant_admin_user"].as<bool>()) {
          tx->rollback();
          co_return fail("forbidden",
                         "A tenant administrator must manage customers.");
        }
        const std::set<std::string> allowed =
            op == "delete" ? std::set<std::string>{"version"}
                           : std::set<std::string>{
                                 "accountNumber",    "name",
                                 "accountingUnitId", "receivableAccountId",
                                 "currencyId",       "isActive",
                                 "version"};
        if (!body.isObject())
          throw std::invalid_argument("Object required.");
        for (auto k : body.getMemberNames())
          if (!allowed.count(k))
            throw std::invalid_argument("Unexpected or server-owned field.");
        if (op != "create") {
          if (!body["version"].isInt() || body["version"].asInt() < 1)
            throw std::invalid_argument("Current version required.");
          auto current = co_await tx->execSqlCoro(
              "SELECT version FROM core_customers WHERE tenant_id=$1 AND id=$2 "
              "AND is_deleted=false FOR UPDATE",
              who.tenantId, id);
          if (current.empty()) {
            tx->rollback();
            co_return fail("not_found", "Customer not found.");
          }
          if (current[0]["version"].as<int>() != body["version"].asInt()) {
            tx->rollback();
            co_return fail("conflict",
                           "Customer changed. Reload before continuing.");
          }
          auto linked = co_await tx->execSqlCoro(
              "SELECT id FROM gl_payment_vouchers WHERE tenant_id=$1 AND "
              "customer_id=$2 AND is_deleted=false LIMIT 1",
              who.tenantId, id);
          if (!linked.empty()) {
            tx->rollback();
            co_return fail("conflict",
                           "A live receipt references this customer. Its "
                           "mapping must be preserved.");
          }
        }
        if (op == "delete") {
          co_await tx->execSqlCoro(
              "UPDATE core_customers SET "
              "is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,last_"
              "modified_at=now(),last_modified_by_user_id=$3,version=version+1 "
              "WHERE tenant_id=$1 AND id=$2 AND is_deleted=false",
              who.tenantId, id, who.userId);
          result.result["deleted"] = true;
        } else {
          text(body["name"], 200);
          text(body["accountNumber"], 80);
          for (auto k :
               {"accountingUnitId", "receivableAccountId", "currencyId"})
            if (!body[k].isString() || !uuid(body[k].asString()))
              throw std::invalid_argument(
                  "Valid unit, receivable GL and currency required.");
          if (!body["isActive"].isBool())
            throw std::invalid_argument("Active flag must be boolean.");
          auto mapping = co_await tx->execSqlCoro(
              "SELECT a.id FROM gl_accounts a JOIN core_accounting_units u ON "
              "u.id=a.accounting_unit_id AND u.tenant_id=a.tenant_id JOIN "
              "core_currencies q ON q.id=$4 AND q.is_deleted=false AND "
              "q.is_active=true WHERE a.tenant_id=$1 AND a.id=$2 AND "
              "a.accounting_unit_id=$3 AND a.is_deleted=false AND "
              "a.status='active' AND a.allow_manual_posting=true AND "
              "a.is_control_account=false AND "
              "COALESCE(a.currency_id,u.base_currency_id)=u.base_currency_id "
              "AND u.is_deleted=false AND u.is_active=true FOR SHARE OF a,u,q",
              who.tenantId, body["receivableAccountId"].asString(),
              body["accountingUnitId"].asString(),
              body["currencyId"].asString());
          if (mapping.empty())
            throw std::invalid_argument(
                "Select a live manual-postable base-currency GL in this unit "
                "and an active currency.");
          const std::string payload = Json::FastWriter().write(body);
          if (op == "create") {
            auto saved = co_await tx->execSqlCoro(
                "INSERT INTO "
                "core_customers(tenant_id,account_number,name,accounting_unit_"
                "id,receivable_account_id,currency_id,is_active,created_by_"
                "user_id) "
                "VALUES($1,$2::jsonb->>'accountNumber',$2::jsonb->>'name',($2::"
                "jsonb->>'accountingUnitId')::uuid,($2::jsonb->>'"
                "receivableAccountId')::uuid,($2::jsonb->>'currencyId')::uuid,("
                "$2::jsonb->>'isActive')::boolean,$3) RETURNING id",
                who.tenantId, payload, who.userId);
            id = saved[0]["id"].as<std::string>();
          } else
            co_await tx->execSqlCoro(
                "UPDATE core_customers SET "
                "account_number=$3::jsonb->>'accountNumber',name=$3::jsonb->>'"
                "name',accounting_unit_id=($3::jsonb->>'accountingUnitId')::"
                "uuid,receivable_account_id=($3::jsonb->>'receivableAccountId')"
                "::uuid,currency_id=($3::jsonb->>'currencyId')::uuid,is_active="
                "($3::jsonb->>'isActive')::boolean,version=version+1,last_"
                "modified_at=now(),last_modified_by_user_id=$4 WHERE "
                "tenant_id=$1 AND id=$2 AND is_deleted=false",
                who.tenantId, id, payload, who.userId);
          auto saved = co_await tx->execSqlCoro(projection() + " AND c.id=$2",
                                                who.tenantId, id);
          result.result = record(saved[0]);
        }
      }
      result.success = true;
    } catch (...) {
      tx->rollback();
      throw;
    }
    if (!(co_await utils::CommitTransaction{std::move(tx)}))
      co_return fail("database_error", "Unable to commit customer change.");
    co_return result;
  } catch (const std::invalid_argument &e) {
    co_return fail("validation_error", e.what());
  } catch (const drogon::orm::UniqueViolation &) {
    co_return fail("conflict", "Customer number is already reserved.");
  } catch (const std::exception &) {
    co_return fail("database_error", "Customer service unavailable.");
  }
}
} // namespace business_desk::domain_services
