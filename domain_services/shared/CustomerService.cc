#include "CustomerService.h"
#include "utils/TransactionUtil.h"
#include <algorithm>
#include <cctype>
#include <utility>
#include <drogon/orm/CoroMapper.h>
#include <regex>
#include <set>
namespace business_desk::domain_services {
namespace {
using drogon::orm::DbClientPtr;
struct Field {
  const char *key;
  const char *column;
  const char *cast;
};
const Field fields[] = {
    {"accountNumber", "account_number", "text"},
    {"name", "name", "text"},
    {"accountingUnitId", "accounting_unit_id", "uuid"},
    {"receivableAccountId", "receivable_account_id", "uuid"},
    {"currencyId", "currency_id", "uuid"},
    {"isActive", "is_active", "boolean"},
    {"customerGroupId", "customer_group_id", "uuid"},
    {"status", "status", "text"},
    {"statusId", "status_id", "uuid"},
    {"vatNumber", "vat_number", "text"},
    {"vatAccountId", "vat_account_id", "uuid"},
    {"creditAccountId", "credit_account_id", "uuid"},
    {"tinNumber", "tin_number", "text"},
    {"email", "email", "text"},
    {"phoneNo", "phone_no", "text"},
    {"address", "address", "text"},
    {"buyingRate", "buying_rate", "numeric"},
    {"sellingRate", "selling_rate", "numeric"},
    {"creditLimit", "credit_limit", "numeric"},
    {"irsAccountId", "irs_account_id", "uuid"},
    {"contactPerson", "contact_person", "text"},
    {"contactPersonPhone", "contact_person_phone", "text"},
    {"contactPersonEmail", "contact_person_email", "text"}};
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
Json::Value parse(const std::string &s) {
  Json::Value v;
  Json::Reader r;
  if (!r.parse(s, v))
    throw std::runtime_error("Invalid customer JSON");
  return v;
}
void text(Json::Value &v, size_t max, bool required = false) {
  if (v.isNull() && !required)
    v = "";
  if (!v.isString())
    throw std::invalid_argument("Text required.");
  auto s = v.asString();
  auto a = s.find_first_not_of(" \t\r\n"), b = s.find_last_not_of(" \t\r\n");
  s = a == s.npos ? "" : s.substr(a, b - a + 1);
  if (s.size() > max || s.find('\0') != s.npos || (required && s.empty()))
    throw std::invalid_argument("Missing or oversized text field.");
  v = s;
}
void validate(Json::Value &b, bool group) {
  text(b["name"], 200, true);
  if (group)
    return;
  for (auto &f : fields) {
    const std::string key = f.key, cast = f.cast;
    if (cast == "uuid") {
      const bool required = key == "accountingUnitId" ||
                            key == "receivableAccountId" || key == "currencyId";
      if (!required && (b[key].isNull() || b[key] == "")) {
        b[key] = Json::nullValue;
        continue;
      }
      if (!b[key].isString() || !uuid(b[key].asString()))
        throw std::invalid_argument("Select valid catalog identifiers.");
      auto s = b[key].asString();
      std::transform(s.begin(), s.end(), s.begin(),
                     [](unsigned char c) { return std::tolower(c); });
      b[key] = s;
    } else if (cast == "boolean") {
      if (!b[key].isBool())
        throw std::invalid_argument("Active flag must be boolean.");
    } else if (cast == "numeric") {
      if (b[key].isNull())
        b[key] = key == "creditLimit" ? "0" : "1";
      const std::string s = b[key].isString() ? b[key].asString() : "";
      const std::regex re(key == "creditLimit"
                              ? R"(^(0|[1-9][0-9]{0,13})(\.[0-9]{1,6})?$)"
                              : R"(^(0|[1-9][0-9]{0,9})(\.[0-9]{1,10})?$)");
      if (!std::regex_match(s, re) ||
          (key != "creditLimit" && s.find_first_not_of("0.") == s.npos))
        throw std::invalid_argument("Use exact decimal strings, positive rates "
                                    "and nonnegative credit limits.");
    } else {
      size_t max = key == "name"                                     ? 200
                   : key == "address"                                ? 1000
                   : key == "email" || key == "contactPersonEmail"   ? 254
                   : key == "contactPerson"                          ? 160
                   : key == "phoneNo" || key == "contactPersonPhone" ? 50
                                                                     : 80;
      text(b[key], max, key == "name" || key == "accountNumber");
      if ((key == "email" || key == "contactPersonEmail") && b[key] != "" &&
          !std::regex_match(b[key].asString(),
                            std::regex(R"(^[^\s@]+@[^\s@]+\.[^\s@]+$)")))
        throw std::invalid_argument("Invalid email address.");
    }
  }
}
std::string projection(bool group) {
  if (group)
    return "SELECT "
           "jsonb_build_object('id',c.id,'name',c.name,'version',c.version,'"
           "createdAt',c.created_at,'createdByUserId',c.created_by_user_id,'"
           "lastModifiedAt',c.last_modified_at,'lastModifiedByUserId',c.last_"
           "modified_by_user_id)::text record FROM core_customer_groups c";
  std::string pairs =
      "'id',c.id,'version',c.version,'balance',c.balance::text,'createdAt',c."
      "created_at,'createdByUserId',c.created_by_user_id,'lastModifiedAt',c."
      "last_modified_at,'lastModifiedByUserId',c.last_modified_by_user_id";
  for (auto &f : fields)
    pairs += ",'" + std::string(f.key) + "',c." + f.column +
             (std::string(f.cast) == "numeric" ? "::text" : "");
  pairs += ",'customerGroupName',COALESCE(g.name,c.customer_group_name),'"
           "currencyName',COALESCE(q.name,c.currency_name),'currencyCode',"
           "COALESCE(q.code,c.currency_code),'receivableAccountName',COALESCE("
           "a.account_name,''),'accountingUnitName',COALESCE(u.name,''),'"
           "vatAccountName',COALESCE(v.account_name,c.vat_account_name),'"
           "creditAccountName',COALESCE(k.account_name,c.credit_account_name),'"
           "irsAccountName',COALESCE(i.account_name,c.irs_account_name)";
  return "SELECT jsonb_build_object(" + pairs +
         ")::text record FROM core_customers c LEFT JOIN core_customer_groups "
         "g ON g.id=c.customer_group_id AND g.tenant_id=c.tenant_id AND "
         "g.is_deleted=false LEFT JOIN core_currencies q ON q.id=c.currency_id "
         "AND q.is_deleted=false LEFT JOIN core_accounting_units u ON "
         "u.id=c.accounting_unit_id AND u.tenant_id=c.tenant_id AND "
         "u.is_deleted=false LEFT JOIN gl_accounts a ON "
         "a.id=c.receivable_account_id AND a.tenant_id=c.tenant_id AND "
         "a.is_deleted=false LEFT JOIN gl_accounts v ON v.id=c.vat_account_id "
         "AND v.tenant_id=c.tenant_id AND v.is_deleted=false LEFT JOIN "
         "gl_accounts k ON k.id=c.credit_account_id AND "
         "k.tenant_id=c.tenant_id AND k.is_deleted=false LEFT JOIN gl_accounts "
         "i ON i.id=c.irs_account_id AND i.tenant_id=c.tenant_id AND "
         "i.is_deleted=false";
}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db, std::string op,
                                       bool group, std::string id,
                                       Json::Value b,
                                       utils::AuditIdentity who) {
  co_await db->execSqlCoro("SET LOCAL lock_timeout='5s'");
  co_await db->execSqlCoro("SET LOCAL statement_timeout='30s'");
  auto actor = co_await db->execSqlCoro(
      "SELECT u.is_tenant_admin_user FROM users u JOIN tenants t ON "
      "t.id=u.tenant_id WHERE u.id=$1 AND u.tenant_id=$2 AND "
      "u.is_deleted=false AND u.is_active=true AND u.is_locked_out=false AND "
      "u.is_host_admin_user=false AND t.is_deleted=false AND t.is_active=true "
      "FOR SHARE OF u,t",
      who.userId, who.tenantId);
  if (actor.empty())
    co_return fail("forbidden", "Live tenant user required.");
  const bool write = op == "create" || op == "update" || op == "delete";
  if (write && !actor[0]["is_tenant_admin_user"].as<bool>())
    co_return fail(
        "forbidden",
        "A tenant administrator must manage customers and customer groups.");
  const std::string table = group ? "core_customer_groups" : "core_customers";
  dto::BaseApiResponse result;
  if (op == "list" || op == "options") {
    if ((b.isMember("pageNo") && !b["pageNo"].isInt()) ||
        (b.isMember("pageSize") && !b["pageSize"].isInt()))
      throw std::invalid_argument("Invalid pagination.");
    int page = b.get("pageNo", 1).asInt(),
        size = b.get("pageSize", 100).asInt();
    auto query = b.get("query", "");
    text(query, 200);
    const auto search = query.asString();
    if (page < 1 || page > 100000 || size < 1 || size > 100)
      throw std::invalid_argument("Invalid pagination.");
    std::string base = projection(group),
                filter = " WHERE c.tenant_id=$1 AND c.is_deleted=false AND "
                         "(strpos(lower(c.name),lower($2))>0";
    if (!group)
      filter += " OR strpos(lower(c.account_number),lower($2))>0 OR "
                "strpos(lower(c.email),lower($2))>0";
    filter += ")";
    if (op == "options") {
      auto kind = b.get("kind", "groups").asString(),
           unit = b.get("accountingUnitId", "").asString();
      if (!unit.empty() && !uuid(unit))
        throw std::invalid_argument("Valid unit required.");
      std::string source, where, label, unitColumn = "''::text";
      if (kind == "groups") {
        source = "core_customer_groups x";
        where = "x.tenant_id=$1 AND x.is_deleted=false";
        label = "x.name";
      } else if (kind == "currencies") {
        source = "core_currencies x";
        where =
            "x.is_deleted=false AND x.is_active=true AND $1::uuid IS NOT NULL";
        label = "x.code||' · '||x.name";
      } else if (kind == "accounts" || kind == "receivables") {
        source = "gl_accounts x JOIN core_accounting_units u ON "
                 "u.id=x.accounting_unit_id AND u.tenant_id=x.tenant_id AND "
                 "u.is_deleted=false AND u.is_active=true";
        where = "x.tenant_id=$1 AND x.is_deleted=false AND x.status='active'";
        label = "u.name||' · '||x.account_number||' — '||x.account_name";
        unitColumn = "x.accounting_unit_id::text";
        if (kind == "receivables")
          where +=
              " AND x.allow_manual_posting=true AND x.is_control_account=false "
              "AND "
              "COALESCE(x.currency_id,u.base_currency_id)=u.base_currency_id";
      } else
        throw std::invalid_argument("Invalid lookup kind.");
      const bool accounts = kind == "accounts" || kind == "receivables";
      const std::string f =
          " WHERE " + where + " AND strpos(lower(" + label + "),lower($2))>0" +
          (accounts ? " AND ($3::text='' OR x.accounting_unit_id::text=$3)"
                    : " AND $3::text IS NOT NULL");
      auto count =
          co_await db->execSqlCoro("SELECT count(*)::int n FROM " + source + f,
                                   who.tenantId, search, unit);
      auto rows = co_await db->execSqlCoro(
          "SELECT jsonb_build_object('id',x.id,'label'," + label +
              ",'unitId'," + unitColumn + ")::text record FROM " + source + f +
              " ORDER BY " + label + ",x.id LIMIT $4::int OFFSET $5::int",
          who.tenantId, search, unit, size, (page - 1) * size);
      result.result["data"] = Json::arrayValue;
      for (auto &r : rows)
        result.result["data"].append(parse(r["record"].as<std::string>()));
      result.result["totalCount"] = count[0]["n"].as<int>();
    } else {
      auto count = co_await db->execSqlCoro("SELECT count(*)::int n FROM " +
                                                table + " c" + filter,
                                            who.tenantId, search);
      auto rows = co_await db->execSqlCoro(
          base + filter +
              " ORDER BY lower(c.name),c.id LIMIT $3::int OFFSET $4::int",
          who.tenantId, search, size, (page - 1) * size);
      result.result["data"] = Json::arrayValue;
      for (auto &r : rows)
        result.result["data"].append(parse(r["record"].as<std::string>()));
      result.result["totalCount"] = count[0]["n"].as<int>();
    }
    result.result["pageNo"] = page;
    result.result["pageSize"] = size;
    result.result["totalPages"] =
        (result.result["totalCount"].asInt() + size - 1) / size;
  } else if (op == "get") {
    auto rows = co_await db->execSqlCoro(
        projection(group) +
            " WHERE c.tenant_id=$1 AND c.id=$2 AND c.is_deleted=false",
        who.tenantId, id);
    if (rows.empty())
      co_return fail("not_found", "Customer record not found.");
    result.result = parse(rows[0]["record"].as<std::string>());
  } else {
    if (!b.isObject())
      throw std::invalid_argument("Object required.");
    std::set<std::string> allowed;
    if (op != "create")
      allowed.insert("version");
    if (op != "delete") {
      allowed.insert("name");
      if (!group)
        for (auto &f : fields)
          allowed.insert(f.key);
    }
    for (auto k : b.getMemberNames())
      if (!allowed.count(k))
        throw std::invalid_argument("Unexpected or server-owned field.");
    Json::Value current;
    if (op != "create") {
      if (!b["version"].isInt() || b["version"].asInt() < 1 ||
          b["version"].asInt() == 2147483647)
        throw std::invalid_argument("Current version required.");
      auto rows = co_await db->execSqlCoro(
          projection(group) + " WHERE c.tenant_id=$1 AND c.id=$2 AND "
                              "c.is_deleted=false FOR UPDATE OF c",
          who.tenantId, id);
      if (rows.empty())
        co_return fail("not_found", "Customer record not found.");
      current = parse(rows[0]["record"].as<std::string>());
      if (current["version"] != b["version"])
        co_return fail("conflict",
                       "Customer record changed. Reload before continuing.");
      if (!group) {
        if (op == "update") {
          for (auto &f : fields)
            if (!b.isMember(f.key))
              b[f.key] = current[f.key];
          validate(b, false);
        }
        auto linked = co_await db->execSqlCoro(
            "SELECT id FROM gl_payment_vouchers WHERE tenant_id=$1 AND "
            "customer_id=$2 AND is_deleted=false LIMIT 1",
            who.tenantId, id);
        bool protectedRecord =
            !linked.empty() || current["balance"].asString().find_first_not_of(
                                   "0.-") != std::string::npos;
        if (protectedRecord) {
          bool changed = op == "delete";
          for (auto k : {"accountNumber", "accountingUnitId",
                         "receivableAccountId", "currencyId", "vatAccountId",
                         "creditAccountId", "irsAccountId", "isActive"})
            if (op == "update" && b[k] != current[k])
              changed = true;
          if (changed)
            co_return fail(
                "conflict",
                "A balance or live receipt prevents deletion or changing "
                "customer posting scope, active state or financial mappings.");
        }
      }
    }
    if (op == "delete") {
      if (group) {
        auto linked = co_await db->execSqlCoro(
            "SELECT id FROM core_customers WHERE tenant_id=$1 AND "
            "customer_group_id=$2 AND is_deleted=false LIMIT 1",
            who.tenantId, id);
        if (!linked.empty())
          co_return fail("conflict",
                         "Move or archive the group's customers first.");
      }
      co_await db->execSqlCoro(
          "UPDATE " + table +
              " SET "
              "is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,last_"
              "modified_at=now(),last_modified_by_user_id=$3,version=version+1 "
              "WHERE tenant_id=$1 AND id=$2 AND is_deleted=false",
          who.tenantId, id, who.userId);
      result.result["id"] = id;
      result.result["deleted"] = true;
    } else {
      validate(b, group);
      Json::Value snapshots(Json::objectValue);
      if (!group) {
        auto mapping = co_await db->execSqlCoro(
            "SELECT a.account_name,u.name,q.name AS currency_name,q.code FROM "
            "gl_accounts a JOIN core_accounting_units u ON "
            "u.id=a.accounting_unit_id AND u.tenant_id=a.tenant_id JOIN "
            "core_currencies q ON q.id=$4 AND q.is_deleted=false AND "
            "q.is_active=true WHERE a.tenant_id=$1 AND a.id=$2 AND "
            "a.accounting_unit_id=$3 AND a.is_deleted=false AND "
            "a.status='active' AND a.allow_manual_posting=true AND "
            "a.is_control_account=false AND "
            "COALESCE(a.currency_id,u.base_currency_id)=u.base_currency_id AND "
            "u.is_deleted=false AND u.is_active=true FOR SHARE OF a,u,q",
            who.tenantId, b["receivableAccountId"].asString(),
            b["accountingUnitId"].asString(), b["currencyId"].asString());
        if (mapping.empty())
          throw std::invalid_argument(
              "Select a live manual-postable base-currency receivable GL in an "
              "active unit and an active currency.");
        snapshots["currency_name"] =
            mapping[0]["currency_name"].as<std::string>();
        snapshots["currency_code"] = mapping[0]["code"].as<std::string>();
        snapshots["customer_group_name"] = "";
        if (!b["customerGroupId"].isNull()) {
          auto g = co_await db->execSqlCoro(
              "SELECT name FROM core_customer_groups WHERE tenant_id=$1 AND "
              "id=$2 AND is_deleted=false FOR SHARE",
              who.tenantId, b["customerGroupId"].asString());
          if (g.empty())
            throw std::invalid_argument(
                "Choose a live customer group in this tenant.");
          snapshots["customer_group_name"] = g[0]["name"].as<std::string>();
        }
        for (auto pair : {std::pair{"vatAccountId", "vat_account_name"},
                          std::pair{"creditAccountId", "credit_account_name"},
                          std::pair{"irsAccountId", "irs_account_name"}}) {
          snapshots[pair.second] = "";
          if (b[pair.first].isNull())
            continue;
          auto a = co_await db->execSqlCoro(
              "SELECT account_name FROM gl_accounts WHERE tenant_id=$1 AND "
              "id=$2 AND accounting_unit_id=$3 AND is_deleted=false AND "
              "status='active' FOR SHARE",
              who.tenantId, b[pair.first].asString(),
              b["accountingUnitId"].asString());
          if (a.empty())
            throw std::invalid_argument("Optional GL accounts must be live and "
                                        "in the same posting unit.");
          snapshots[pair.second] = a[0]["account_name"].as<std::string>();
        }
      }
      std::string cols, values, assign;
      auto add = [&](std::string column, std::string value) {
        if (!cols.empty()) {
          cols += ",";
          values += ",";
          assign += ",";
        }
        cols += column;
        values += value;
        assign += column + "=" + value;
      };
      if (group)
        add("name", "$3::jsonb->>'name'");
      else {
        for (auto &f : fields)
          add(f.column,
              "($3::jsonb->>'" + std::string(f.key) + "')::" + f.cast);
        for (auto col : snapshots.getMemberNames()) {
          const std::string key = "snapshot_" + col;
          b[key] = snapshots[col];
          add(col, "$3::jsonb->>'" + key + "'");
        }
      }
      const std::string payload = Json::FastWriter().write(b);
      if (op == "create") {
        auto saved = co_await db->execSqlCoro(
            "INSERT INTO " + table + "(tenant_id,created_by_user_id," + cols +
                ") VALUES($1,$2," + values + ") RETURNING id",
            who.tenantId, who.userId, payload);
        id = saved[0]["id"].as<std::string>();
      } else
        co_await db->execSqlCoro(
            "UPDATE " + table + " SET " + assign +
                ",last_modified_at=now(),last_modified_by_user_id=$4,version="
                "version+1 WHERE tenant_id=$1 AND id=$2 AND is_deleted=false",
            who.tenantId, id, payload, who.userId);
      auto saved = co_await db->execSqlCoro(
          projection(group) +
              " WHERE c.tenant_id=$1 AND c.id=$2 AND c.is_deleted=false",
          who.tenantId, id);
      result.result = parse(saved[0]["record"].as<std::string>());
    }
  }
  result.success = true;
  co_return result;
}
} // namespace
drogon::Task<dto::BaseApiResponse>
CustomerService::execute(std::string op, std::string id, Json::Value body,
                         utils::AuditIdentity who) {
  if (!uuid(who.tenantId) || !uuid(who.userId))
    co_return fail("unauthorized", "Tenant sign-in required.");
  bool group = op.starts_with("group-");
  if (group)
    op = op.substr(6);
  try {
    if (op != "list" && op != "get" && op != "options" && op != "create" &&
        op != "update" && op != "delete")
      throw std::invalid_argument("Unsupported operation.");
    if ((op == "get" || op == "update" || op == "delete") && !uuid(id))
      throw std::invalid_argument("Valid record ID required.");
    auto db = drogon::app().getDbClient();
    auto ready = co_await db->execSqlCoro(
        "SELECT to_regclass('core_customer_groups') IS NOT NULL AND "
        "EXISTS(SELECT 1 FROM pg_attribute WHERE "
        "attrelid=to_regclass('core_customers') AND attname='buying_rate' AND "
        "NOT attisdropped) AS ready");
    if (!ready[0]["ready"].as<bool>())
      co_return fail("schema_not_ready",
                     "Apply migrations through 022_customer_groups.sql.");
    auto tx = co_await db->newTransactionCoro();
    dto::BaseApiResponse r;
    try {
      r = co_await run(tx, op, group, id, body, who);
    } catch (...) {
      tx->rollback();
      throw;
    }
    if (!r.success) {
      tx->rollback();
      co_return r;
    }
    if (!(co_await utils::CommitTransaction{std::move(tx)}))
      co_return fail("database_error", "Unable to commit customer change.");
    co_return r;
  } catch (const std::invalid_argument &e) {
    co_return fail("validation_error", e.what());
  } catch (const drogon::orm::UniqueViolation &) {
    co_return fail("conflict", "Customer number or group name is reserved.");
  } catch (const std::exception &) {
    co_return fail("database_error", "Customer service unavailable.");
  }
}
} // namespace business_desk::domain_services
