#include "SupplierService.h"
#include "utils/TransactionUtil.h"
#include <algorithm>
#include <cctype>
#include <cstdint>
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
const Field fields[] = {{"accountNumber", "account_number", "text"},
                        {"supplierGroupId", "supplier_group_id", "uuid"},
                        {"statusId", "status", "text"},
                        {"vatAccountId", "vat_account_id", "uuid"},
                        {"creditAccountId", "credit_account_id", "uuid"},
                        {"debitAccountId", "debit_account_id", "uuid"},
                        {"tinNumber", "tin_number", "text"},
                        {"name", "name", "text"},
                        {"email", "email", "text"},
                        {"phoneNo", "phone_no", "text"},
                        {"address", "address", "text"},
                        {"contactPerson", "contact_person", "text"},
                        {"contactPersonPhone", "contact_person_phone", "text"},
                        {"contactPersonEmail", "contact_person_email", "text"},
                        {"vatNumber", "vat_number", "text"},
                        {"currencyId", "currency_id", "uuid"},
                        {"buyingRate", "buying_rate", "numeric"},
                        {"sellingRate", "selling_rate", "numeric"},
                        {"creditLimit", "credit_limit", "numeric"},
                        {"irsAccountId", "irs_account_id", "uuid"},
                        {"isResident", "is_resident", "boolean"},
                        {"taxOffice", "tax_office", "text"}};
dto::BaseApiResponse fail(const char *code, const char *message) {
  dto::BaseApiResponse r;
  r.error["code"] = code;
  r.error["message"] = message;
  return r;
}
bool uuid(const std::string &s) {
  static const std::regex re(
      "^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");
  return std::regex_match(s, re) && s != "00000000-0000-0000-0000-000000000000";
}
std::string trim(const std::string &s) {
  auto a = s.find_first_not_of(" \t\r\n"), b = s.find_last_not_of(" \t\r\n");
  return a == std::string::npos ? "" : s.substr(a, b - a + 1);
}
Json::Value parse(const std::string &text) {
  Json::Value r;
  Json::Reader reader;
  if (!reader.parse(text, r))
    throw std::runtime_error("Invalid database JSON");
  return r;
}
bool validate(Json::Value &b, bool group, bool update) {
  if (!b.isObject())
    return false;
  std::set<std::string> allowed{"name"};
  if (!group)
    for (auto &f : fields)
      allowed.insert(f.key);
  if (update)
    allowed.insert("version");
  for (const auto &k : b.getMemberNames())
    if (!allowed.count(k))
      return false;
  if (update && (!b["version"].isInt() || b["version"].asInt() < 1 ||
                 b["version"].asInt() == 2147483647))
    return false;
  if (group) {
    if (!b["name"].isString())
      return false;
    b["name"] = trim(b["name"].asString());
    return !b["name"].asString().empty() &&
           b["name"].asString().size() <= 200 &&
           b["name"].asString().find('\0') == std::string::npos;
  }
  for (const auto &f : fields) {
    std::string key = f.key, cast = f.cast;
    if (cast == "boolean") {
      if (!b[key].isBool())
        return false;
      continue;
    }
    if (!b.isMember(key) && cast == "text" && key != "name" &&
        key != "accountNumber" && key != "statusId")
      b[key] = "";
    if (!b[key].isString())
      return false;
    auto s = trim(b[key].asString());
    b[key] = s;
    if (s.find('\0') != std::string::npos)
      return false;
    if (cast == "uuid") {
      if (!uuid(s))
        return false;
      std::transform(s.begin(), s.end(), s.begin(),
                     [](unsigned char c) { return std::tolower(c); });
      b[key] = s;
      continue;
    }
    if (cast == "numeric") {
      const std::regex re(key == "creditLimit"
                              ? R"(^(0|[1-9][0-9]{0,13})(\.[0-9]{1,6})?$)"
                              : R"(^(0|[1-9][0-9]{0,9})(\.[0-9]{1,10})?$)");
      if (!std::regex_match(s, re) ||
          (key != "creditLimit" &&
           s.find_first_not_of("0.") == std::string::npos))
        return false;
      continue;
    }
    size_t max = key == "address"                                  ? 1000
                 : key == "email" || key == "contactPersonEmail"   ? 254
                 : key == "name"                                   ? 200
                 : key == "contactPerson" || key == "taxOffice"    ? 160
                 : key == "phoneNo" || key == "contactPersonPhone" ? 50
                                                                   : 80;
    if (s.size() > max ||
        ((key == "name" || key == "accountNumber") && s.empty()))
      return false;
    if ((key == "email" || key == "contactPersonEmail") && !s.empty() &&
        !std::regex_match(s, std::regex(R"(^[^\s@]+@[^\s@]+\.[^\s@]+$)")))
      return false;
  }
  return b["statusId"] == "active" || b["statusId"] == "on_hold" ||
         b["statusId"] == "inactive";
}
const std::string supplierSelect =
    "SELECT "
    "jsonb_build_object('id',s.id,'version',s.version,'createdAt',s.created_at,"
    "'createdByUserId',s.created_by_user_id,'lastModifiedAt',s.last_modified_"
    "at,'lastModifiedByUserId',s.last_modified_by_user_id,'balance',s.balance::"
    "text,'accountNumber',s.account_number,'supplierGroupId',s.supplier_group_"
    "id::text,'statusId',s.status,'vatAccountId',s.vat_account_id::text,'"
    "creditAccountId',s.credit_account_id::text,'debitAccountId',s.debit_"
    "account_id::text,'tinNumber',s.tin_number,'name',s.name,'email',s.email,'"
    "phoneNo',s.phone_no,'address',s.address,'contactPerson',s.contact_person,'"
    "contactPersonPhone',s.contact_person_phone,'contactPersonEmail',s.contact_"
    "person_email,'vatNumber',s.vat_number,'currencyId',s.currency_id::text,'"
    "buyingRate',s.buying_rate::text,'sellingRate',s.selling_rate::text,'"
    "creditLimit',s.credit_limit::text,'irsAccountId',s.irs_account_id::text,'"
    "isResident',s.is_resident,'taxOffice',s.tax_office,'supplierGroupName',"
    "coalesce(g.name,''),'statusName',CASE s.status WHEN 'active' THEN "
    "'Active' WHEN 'on_hold' THEN 'On hold' ELSE 'Inactive' "
    "END,'currencyName',coalesce(c.name,''),'currencyCode',coalesce(c.code,''),"
    "'vatAccountName',coalesce(v.account_name,''),'creditAccountName',coalesce("
    "a.account_name,''),'debitAccountName',coalesce(d.account_name,''),'"
    "irsAccountName',coalesce(i.account_name,''),'accountingUnitId',a."
    "accounting_unit_id,'accountingUnitName',coalesce(u.name,''))::text AS "
    "record  FROM core_suppliers s LEFT JOIN core_supplier_groups g ON "
    "g.id=s.supplier_group_id AND g.tenant_id=s.tenant_id AND "
    "g.is_deleted=false LEFT JOIN core_currencies c ON c.id=s.currency_id AND "
    "c.is_deleted=false LEFT JOIN gl_accounts v ON v.id=s.vat_account_id AND "
    "v.tenant_id=s.tenant_id AND v.is_deleted=false LEFT JOIN gl_accounts a ON "
    "a.id=s.credit_account_id AND a.tenant_id=s.tenant_id AND "
    "a.is_deleted=false LEFT JOIN gl_accounts d ON d.id=s.debit_account_id AND "
    "d.tenant_id=s.tenant_id AND d.is_deleted=false LEFT JOIN gl_accounts i ON "
    "i.id=s.irs_account_id AND i.tenant_id=s.tenant_id AND i.is_deleted=false "
    "LEFT JOIN core_accounting_units u ON u.id=a.accounting_unit_id AND "
    "u.tenant_id=s.tenant_id AND u.is_deleted=false";
const std::string groupSelect =
    "SELECT "
    "jsonb_build_object('id',s.id,'name',s.name,'version',s.version,'createdAt'"
    ",s.created_at,'createdByUserId',s.created_by_user_id,'lastModifiedAt',s."
    "last_modified_at,'lastModifiedByUserId',s.last_modified_by_user_id)::text "
    "AS record FROM core_supplier_groups s";
drogon::Task<dto::BaseApiResponse>
run(DbClientPtr db, std::string op, bool group, std::string id, Json::Value b,
    int page, int size, std::string query, std::string kind, std::string unit,
    utils::AuditIdentity who) {
  const bool write = op == "create" || op == "update" || op == "delete";
  if (write) {
    co_await db->execSqlCoro("SET LOCAL lock_timeout='5s'");
    co_await db->execSqlCoro("SET LOCAL statement_timeout='15s'");
  }
  auto actor = co_await db->execSqlCoro(
      "SELECT u.id FROM users u JOIN tenants t ON t.id=u.tenant_id AND "
      "t.is_deleted=false AND t.is_active=true WHERE u.id=$1 AND "
      "u.tenant_id=$2 AND u.is_deleted=false AND u.is_active=true AND "
      "u.is_locked_out=false AND u.is_host_admin_user=false" +
          std::string(write ? " FOR SHARE OF u,t" : ""),
      who.userId, who.tenantId);
  if (actor.empty())
    co_return fail("forbidden", "A live tenant user is required.");
  dto::BaseApiResponse r;
  const int64_t limit = size, offset = (int64_t(page) - 1) * size;
  if (op == "options") {
    std::string source, where, label;
    if (kind == "groups") {
      source = "core_supplier_groups x";
      where = "x.tenant_id=$1 AND x.is_deleted=false AND $3::text IS NOT NULL";
      label = "x.name";
    } else if (kind == "currencies") {
      source = "core_currencies x";
      where = "x.is_deleted=false AND x.is_active=true AND $1::uuid IS NOT "
              "NULL AND $3::text IS NOT NULL";
      label = "x.code||' · '||x.name";
    } else {
      source = "gl_accounts x JOIN core_accounting_units u ON "
               "u.id=x.accounting_unit_id AND u.tenant_id=x.tenant_id AND "
               "u.is_deleted=false AND u.is_active=true";
      where = "x.tenant_id=$1 AND x.is_deleted=false AND x.status='active' AND "
              "($3::text='' OR x.accounting_unit_id::text=$3)";
      if (kind == "credits")
        where += " AND x.standard_account_type=1";
      label = "u.name||' · '||x.account_number||' — '||x.account_name";
    }
    const std::string filter =
        " WHERE " + where + " AND strpos(lower(" + label + "),lower($2))>0";
    auto total = co_await db->execSqlCoro("SELECT count(*) AS total FROM " +
                                              source + filter,
                                          who.tenantId, query, unit);
    auto rows = co_await db->execSqlCoro(
        "SELECT x.id," +
            std::string(kind == "groups" || kind == "currencies"
                            ? "''::text"
                            : "x.accounting_unit_id::text") +
            " AS unit_id," + label + " AS label FROM " + source + filter +
            " ORDER BY label,x.id LIMIT $4::bigint OFFSET $5::bigint",
        who.tenantId, query, unit, limit, offset);
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows) {
      Json::Value v;
      v["id"] = row["id"].as<std::string>();
      v["label"] = row["label"].as<std::string>();
      v["unitId"] = row["unit_id"].as<std::string>();
      r.result["data"].append(v);
    }
    r.result["totalCount"] = Json::Int64(total[0]["total"].as<int64_t>());
  } else {
    const std::string table = group ? "core_supplier_groups" : "core_suppliers",
                      base = group ? groupSelect : supplierSelect;
    if (op == "list") {
      const std::string filter =
          " WHERE s.tenant_id=$1 AND s.is_deleted=false AND "
          "(strpos(lower(s.name),lower($2))>0" +
          std::string(group ? ""
                            : " OR strpos(lower(s.account_number),lower($2))>0 "
                              "OR strpos(lower(s.email),lower($2))>0") +
          ")";
      auto total = co_await db->execSqlCoro("SELECT count(*) AS total FROM " +
                                                table + " s" + filter,
                                            who.tenantId, query);
      auto rows = co_await db->execSqlCoro(
          base + filter +
              " ORDER BY lower(s.name),s.id LIMIT $3::bigint OFFSET $4::bigint",
          who.tenantId, query, limit, offset);
      r.result["data"] = Json::arrayValue;
      for (const auto &row : rows)
        r.result["data"].append(parse(row["record"].as<std::string>()));
      r.result["totalCount"] = Json::Int64(total[0]["total"].as<int64_t>());
    } else if (op == "get") {
      auto rows = co_await db->execSqlCoro(
          base + " WHERE s.tenant_id=$1 AND s.id=$2 AND s.is_deleted=false",
          who.tenantId, id);
      if (rows.empty())
        co_return fail("not_found", "Record not found.");
      r.result = parse(rows[0]["record"].as<std::string>());
    } else {
      if (op != "create") {
        auto existing = co_await db->execSqlCoro(
            "SELECT id FROM " + table +
                " WHERE tenant_id=$1 AND id=$2 AND is_deleted=false",
            who.tenantId, id);
        if (existing.empty())
          co_return fail("not_found", "Record not found.");
      }
      // Lock relationships in a stable order before the supplier, serializing
      // parent deletion.
      if (!group && (op == "create" || op == "update")) {
        auto groups = co_await db->execSqlCoro(
            "SELECT id FROM core_supplier_groups WHERE tenant_id=$1 AND id=$2 "
            "AND is_deleted=false FOR SHARE",
            who.tenantId, b["supplierGroupId"].asString());
        // Ledger mutations lock the unit before currency/accounts too.
        auto selectedUnit = co_await db->execSqlCoro(
            "SELECT u.id FROM core_accounting_units u JOIN gl_accounts a ON "
            "a.accounting_unit_id=u.id AND a.tenant_id=u.tenant_id AND "
            "a.is_deleted=false "
            "AND a.status='active' WHERE u.tenant_id=$1 AND a.id=$2 AND "
            "u.is_deleted=false "
            "AND u.is_active=true FOR SHARE OF u",
            who.tenantId, b["creditAccountId"].asString());
        if (selectedUnit.empty())
          co_return fail(
              "validation_error",
              "Select a credit account in an active accounting unit.");
        const std::string selectedUnitId =
            selectedUnit[0]["id"].as<std::string>();
        auto currency = co_await db->execSqlCoro(
            "SELECT id FROM core_currencies WHERE id=$1 AND is_deleted=false "
            "AND is_active=true FOR SHARE",
            b["currencyId"].asString());
        if (groups.empty() || currency.empty())
          co_return fail("validation_error",
                         "Select a live supplier group and active currency.");
        auto accounts = co_await db->execSqlCoro(
            "SELECT a.id,a.accounting_unit_id,a.standard_account_type FROM "
            "gl_accounts a JOIN core_accounting_units u ON "
            "u.id=a.accounting_unit_id AND u.tenant_id=a.tenant_id AND "
            "u.is_deleted=false AND u.is_active=true WHERE a.tenant_id=$1 AND "
            "a.is_deleted=false AND a.status='active' AND a.id IN($2,$3,$4,$5) "
            "AND a.accounting_unit_id=$6 ORDER BY a.id FOR SHARE OF a",
            who.tenantId, b["creditAccountId"].asString(),
            b["debitAccountId"].asString(), b["vatAccountId"].asString(),
            b["irsAccountId"].asString(), selectedUnitId);
        std::set<std::string> found, units;
        bool liability = false;
        for (const auto &a : accounts) {
          auto aid = a["id"].as<std::string>();
          found.insert(aid);
          units.insert(a["accounting_unit_id"].as<std::string>());
          if (aid == b["creditAccountId"].asString() &&
              a["standard_account_type"].as<int>() == 1)
            liability = true;
        }
        for (auto key : {"creditAccountId", "debitAccountId", "vatAccountId",
                         "irsAccountId"})
          if (!found.count(b[key].asString()))
            co_return fail(
                "validation_error",
                "Select active GL accounts belonging to this tenant.");
        if (units.size() != 1 || !liability)
          co_return fail("validation_error",
                         "All GL accounts must belong to one accounting unit; "
                         "the credit account must be a liability.");
      }
      if (op != "create") {
        auto rows = co_await db->execSqlCoro(
            "SELECT version" +
                std::string(
                    group ? ""
                          : ",account_number,balance<>0 AS "
                            "has_balance,currency_id,credit_account_id,debit_"
                            "account_id,vat_account_id,irs_account_id") +
                " FROM " + table +
                " WHERE tenant_id=$1 AND id=$2 AND is_deleted=false FOR UPDATE",
            who.tenantId, id);
        if (rows.empty())
          co_return fail("not_found", "Record not found.");
        if (op == "update" &&
            rows[0]["version"].as<int>() != b["version"].asInt())
          co_return fail("conflict", "Record changed. Reload before saving.");
        bool hasVouchers = false;
        if (!group) {
          auto vouchers = co_await db->execSqlCoro(
              "SELECT id FROM gl_payment_vouchers WHERE tenant_id=$1 AND "
              "supplier_id=$2 AND is_deleted=false LIMIT 1",
              who.tenantId, id);
          hasVouchers = !vouchers.empty();
        }
        if (!group && (rows[0]["has_balance"].as<bool>() || hasVouchers)) {
          bool changed =
              op == "delete" || rows[0]["account_number"].as<std::string>() !=
                                    b["accountNumber"].asString();
          for (auto &f : fields)
            if (std::string(f.cast) == "uuid" &&
                std::string(f.key) != "supplierGroupId" &&
                rows[0][f.column].as<std::string>() != b[f.key].asString())
              changed = true;
          if (changed)
            co_return fail(
                "conflict",
                "A balance or live payment voucher prevents deletion or "
                "changing account number, currency and posting accounts.");
        }
      }
      if (op == "delete") {
        if (group) {
          auto used = co_await db->execSqlCoro(
              "SELECT id FROM core_suppliers WHERE tenant_id=$1 AND "
              "supplier_group_id=$2 AND is_deleted=false LIMIT 1",
              who.tenantId, id);
          if (!used.empty())
            co_return fail("conflict",
                           "Move or delete the group's suppliers first.");
        }
        co_await db->execSqlCoro(
            "UPDATE " + table +
                " SET "
                "is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,last_"
                "modified_at=now(),last_modified_by_user_id=$3,version=version+"
                "1 WHERE tenant_id=$1 AND id=$2 AND is_deleted=false",
            who.tenantId, id, who.userId);
        r.result["id"] = id;
        r.result["isDeleted"] = true;
      } else {
        std::string cols, values, assign;
        if (group) {
          cols = "name";
          values = "($3::jsonb->>'name')";
          assign = "name=" + values;
        } else
          for (const auto &f : fields) {
            if (!cols.empty()) {
              cols += ",";
              values += ",";
              assign += ",";
            }
            const std::string value =
                "($3::jsonb->>'" + std::string(f.key) + "')::" + f.cast;
            cols += f.column;
            values += value;
            assign += std::string(f.column) + "=" + value;
          }
        const std::string json = Json::FastWriter().write(b);
        if (op == "create") {
          auto rows = co_await db->execSqlCoro(
              "INSERT INTO " + table + "(tenant_id,created_by_user_id," + cols +
                  ") VALUES($1,$2," + values + ") RETURNING id",
              who.tenantId, who.userId, json);
          id = rows[0]["id"].as<std::string>();
        } else
          co_await db->execSqlCoro(
              "UPDATE " + table + " SET " + assign +
                  ",last_modified_at=now(),last_modified_by_user_id=$4,version="
                  "version+1 WHERE tenant_id=$1 AND id=$2 AND is_deleted=false",
              who.tenantId, id, json, who.userId);
        auto saved = co_await db->execSqlCoro(
            base + " WHERE s.tenant_id=$1 AND s.id=$2 AND s.is_deleted=false",
            who.tenantId, id);
        r.result = parse(saved[0]["record"].as<std::string>());
      }
    }
  }
  if (op == "list" || op == "options") {
    auto total = r.result["totalCount"].asInt64();
    r.result["pageNo"] = page;
    r.result["pageSize"] = size;
    r.result["totalPages"] = Json::Int64((total + size - 1) / size);
  }
  r.success = true;
  co_return r;
}
} // namespace
drogon::Task<dto::BaseApiResponse>
SupplierService::execute(std::string op, bool group, std::string id,
                         Json::Value body, int page, int size,
                         std::string query, std::string kind, std::string unit,
                         utils::AuditIdentity who) {
  if (!uuid(who.tenantId) || !uuid(who.userId))
    co_return fail("unauthorized", "Tenant authentication required.");
  if (op != "list" && op != "get" && op != "create" && op != "update" &&
      op != "delete" && op != "options")
    co_return fail("validation_error", "Invalid operation.");
  if (((op == "get" || op == "update" || op == "delete") && !uuid(id)) ||
      page < 1 || page > 1000000 || size < 1 || size > 100 ||
      query.size() > 200 || query.find('\0') != std::string::npos ||
      (!unit.empty() && !uuid(unit)))
    co_return fail("validation_error", "Invalid record or list parameters.");
  if (op == "options" && (kind != "groups" && kind != "currencies" &&
                          kind != "accounts" && kind != "credits"))
    co_return fail("validation_error", "Invalid lookup kind.");
  if ((op == "create" || op == "update") &&
      !validate(body, group, op == "update"))
    co_return fail(
        "validation_error",
        "Check required fields, email, identifiers and exact decimal strings.");
  try {
    auto db = drogon::app().getDbClient();
    auto ready = co_await db->execSqlCoro(
        "SELECT to_regclass('core_suppliers') IS NOT NULL AND "
        "to_regclass('core_supplier_groups') IS NOT NULL AS ready");
    if (!ready[0]["ready"].as<bool>())
      co_return fail("schema_not_ready", "Apply migration 016_suppliers.sql.");
    if (op == "get" || op == "list" || op == "options")
      co_return co_await run(db, op, group, id, body, page, size, query, kind,
                             unit, who);
    auto tx = co_await db->newTransactionCoro();
    dto::BaseApiResponse r;
    try {
      r = co_await run(tx, op, group, id, body, page, size, query, kind, unit,
                       who);
    } catch (...) {
      // A C++ transport/serialization exception must not auto-commit earlier
      // writes.
      tx->rollback();
      throw;
    }
    if (!r.success) {
      tx->rollback();
      co_return r;
    }
    if (!(co_await utils::CommitTransaction{std::move(tx)}))
      co_return fail("database_error", "Unable to commit supplier changes.");
    co_return r;
  } catch (const drogon::orm::UniqueViolation &) {
    co_return fail("conflict", "Name or account number is reserved, or "
                               "supplier references prevent this change.");
  } catch (const std::exception &) {
    co_return fail("database_error", "Supplier service unavailable.");
  }
}
} // namespace business_desk::domain_services
