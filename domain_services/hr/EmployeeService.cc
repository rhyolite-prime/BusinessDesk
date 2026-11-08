#include "EmployeeService.h"
#include "EmployeeFields.h"
#include "constants/TenantConstants.h"
#include "domain_services/permissions/PermissionService.h"
#include "utils/TransactionUtil.h"
#include <algorithm>
#include <cctype>
#include <chrono>
#include <cstdint>
#include <regex>
#include <set>
#include <stdexcept>
#include <vector>
namespace business_desk::domain_services {
namespace {
using drogon::orm::DbClientPtr;
using employee_fields::fields;
dto::BaseApiResponse fail(const char *code, const std::string &message) {
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
  const auto a = s.find_first_not_of(" \t\r\n"),
             b = s.find_last_not_of(" \t\r\n");
  return a == std::string::npos ? "" : s.substr(a, b - a + 1);
}
bool text(const std::string &s, unsigned max) {
  return s.find('\0') == std::string::npos &&
         std::count_if(s.begin(), s.end(), [](unsigned char c) {
           return (c & 0xc0) != 0x80;
         }) <= max;
}
bool date(const std::string &s) {
  if (!std::regex_match(s, std::regex(R"(^[12][0-9]{3}-[0-9]{2}-[0-9]{2}$)")))
    return false;
  int y = std::stoi(s.substr(0, 4)), m = std::stoi(s.substr(5, 2)),
      d = std::stoi(s.substr(8, 2));
  return y >= 1900 &&
         std::chrono::year_month_day{std::chrono::year{y},
                                     std::chrono::month{unsigned(m)},
                                     std::chrono::day{unsigned(d)}}
             .ok();
}
std::string validate(Json::Value &b, bool update) {
  if (!b.isObject())
    return "Expected an employee object.";
  std::set<std::string> allowed;
  for (const auto &f : fields)
    allowed.insert(f.key);
  if (update)
    allowed.insert("version");
  for (const auto &key : b.getMemberNames())
    if (!allowed.count(key))
      return "Unknown or server-owned field: " + key;
  if (update && (!b["version"].isInt() || b["version"].asInt() < 1 ||
                 b["version"].asInt() == 2147483647))
    return "A valid record version is required.";
  for (const auto &f : fields) {
    const std::string key = f.key, kind = f.kind;
    auto &v = b[key];
    if (kind == "uuid" || (kind == "date" && !f.required)) {
      if (v.isNull() || (v.isString() && trim(v.asString()).empty())) {
        v = Json::nullValue;
        continue;
      }
    }
    if (kind == "array") {
      if (v.isNull())
        v = Json::arrayValue;
      if (!v.isArray() || v.size() > 50)
        return key + ": use up to 50 text items.";
      for (auto &item : v) {
        if (!item.isString())
          return key + ": text items required.";
        const auto s = trim(item.asString());
        if (s.empty() || !text(s, 200))
          return key + ": items must contain 1-200 characters.";
        item = s;
      }
      continue;
    }
    if (kind == "int") {
      if (v.isNull())
        v = 0;
      const int max = key == "status" ? 32767 : 366;
      if (!v.isInt() || v.asInt() < 0 || v.asInt() > max)
        return key + ": invalid integer range.";
      continue;
    }
    if (kind == "decimal") {
      if (v.isNull())
        v = "0";
      if (!v.isString())
        return key + ": use an exact non-negative decimal string.";
      auto s = trim(v.asString());
      const std::string pattern =
          key == "medicalExpensesLimit"
              ? R"(^(0|[1-9][0-9]{0,13})(\.[0-9]{1,6})?$)"
              : R"(^(0|[1-9][0-9]{0,3})(\.[0-9]{1,3})?$)";
      if (!std::regex_match(s, std::regex(pattern)))
        return key + ": invalid decimal precision.";
      if ((key == "height" && std::stod(s) > 3) ||
          (key == "weight" && std::stod(s) > 1000))
        return key + ": value is out of range.";
      v = s;
      continue;
    }
    if (kind == "text" && !f.required && v.isNull())
      v = "";
    if (!v.isString())
      return key + ": text is required.";
    auto s = trim(v.asString());
    if (kind == "uuid") {
      if (!uuid(s))
        return key + ": a UUID is required.";
      std::transform(s.begin(), s.end(), s.begin(),
                     [](unsigned char c) { return std::tolower(c); });
    } else if (kind == "date") {
      if (!date(s))
        return key + ": use a valid ISO date (1900-2999).";
    } else {
      if (!text(s, f.max) || (f.required && s.empty()))
        return key + ": check required text and maximum length.";
      if ((key == "personalEmail" || key == "companyEmail") && !s.empty() &&
          !std::regex_match(s, std::regex(R"(^[^\s@]+@[^\s@]+\.[^\s@]+$)")))
        return key + ": invalid email address.";
      if (key == "employeePhoto" && !s.empty() &&
          !(s.starts_with("/") && !s.starts_with("//")) &&
          !s.starts_with("https://"))
        return "employeePhoto: use a relative path or HTTPS URL.";
    }
    v = s;
  }
  if (b["dateAppointed"].asString() < b["dateOfBirth"].asString())
    return "Date appointed cannot precede date of birth.";
  const auto today = std::chrono::year_month_day(
      std::chrono::floor<std::chrono::days>(std::chrono::system_clock::now()));
  const auto dob = b["dateOfBirth"].asString();
  if (std::chrono::year_month_day{
          std::chrono::year{std::stoi(dob.substr(0, 4))},
          std::chrono::month{unsigned(std::stoi(dob.substr(5, 2)))},
          std::chrono::day{unsigned(std::stoi(dob.substr(8, 2)))}} > today)
    return "Date of birth cannot be in the future.";
  if (!b["driverLicenseIssueDate"].isNull() &&
      !b["driverLicenseExpiryDate"].isNull() &&
      b["driverLicenseExpiryDate"].asString() <
          b["driverLicenseIssueDate"].asString())
    return "Driver licence expiry cannot precede issue date.";
  return {};
}
Json::Value parse(const std::string &s) {
  Json::Value v;
  Json::Reader r;
  if (!r.parse(s, v))
    throw std::runtime_error("Invalid database JSON");
  return v;
}
std::string select(bool full) {
  std::string expr = "jsonb_build_object('id',e.id,'version',e.version";
  int count = 2;
  const std::set<std::string> summary{
      "employeeIdentifier", "firstName",    "otherName", "lastName",
      "departmentName",     "categoryName", "status"};
  for (const auto &f : fields) {
    if (!full && !summary.count(f.key))
      continue;
    if (count == 20) {
      expr += ")||jsonb_build_object(";
      count = 0;
    } else
      expr += ",";
    expr += "'" + std::string(f.key) + "',e." + f.column +
            (std::string(f.kind) == "decimal" ? "::text" : "");
    ++count;
  }
  expr += ")";
  if (full)
    expr += "||jsonb_build_object('createdAt',e.created_at,'createdByUserId',e."
            "created_by_user_id,'lastModifiedAt',e.last_modified_at,'"
            "lastModifiedByUserId',e.last_modified_by_user_id)";
  return "SELECT (" + expr + ")::text AS record FROM hr_employee_biodata e";
}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db, std::string op,
                                       std::string id, Json::Value b, int page,
                                       int size, std::string query,
                                       utils::AuditIdentity who) {
  const bool write = op == "create" || op == "update" || op == "delete";
  if (write) {
    co_await db->execSqlCoro("SET LOCAL lock_timeout='5s'");
    co_await db->execSqlCoro("SET LOCAL statement_timeout='15s'");
  }
  const std::string actorSql =
      "SELECT u.is_tenant_admin_user FROM users u JOIN tenants t ON "
      "t.id=u.tenant_id AND t.is_deleted=false AND t.is_active=true WHERE "
      "u.id=$1 AND u.tenant_id=$2 AND u.is_deleted=false AND u.is_active=true "
      "AND u.is_locked_out=false AND u.is_host_admin_user=false" +
      std::string(write ? " FOR SHARE OF u,t" : "");
  auto actor = co_await db->execSqlCoro(actorSql, who.userId, who.tenantId);
  if (actor.empty())
    co_return fail("forbidden", "A live tenant user is required.");
  // Options deliberately expose only payee identity, never personal/medical
  // data.
  bool canWrite = actor[0]["is_tenant_admin_user"].as<bool>();
  if (op != "options" && !canWrite) {
    const auto grants =
        co_await PermissionService::getUserPermissions(who.userId);
    canWrite = grants.count("*") || grants.count("employees.manage") ||
               grants.count("employees.write");
    if ((write && !canWrite) ||
        (!write && !canWrite && !grants.count("employees.read")))
      co_return fail("forbidden", "Employee biodata permission or tenant "
                                  "administrator access required.");
  }
  dto::BaseApiResponse r;
  const int64_t limit = size, offset = (int64_t(page) - 1) * size;
  if (op == "list" || op == "options") {
    const std::string filter =
        " WHERE e.tenant_id=$1 AND e.is_deleted=false AND "
        "(strpos(lower(e.employee_identifier),lower($2))>0 OR "
        "strpos(lower(concat_ws(' "
        "',e.first_name,NULLIF(e.other_name,''),e.last_name)),lower($2))>0 OR "
        "strpos(lower(e.department_name),lower($2))>0)";
    auto totals = co_await db->execSqlCoro(
        "SELECT count(*) AS total FROM hr_employee_biodata e" + filter,
        who.tenantId, query);
    const std::string projection =
        op == "options"
            ? "SELECT "
              "jsonb_build_object('id',e.id,'employeeIdentifier',e.employee_"
              "identifier,'name',concat_ws(' "
              "',e.first_name,NULLIF(e.other_name,''),e.last_name),'status',e."
              "status)::text AS record FROM hr_employee_biodata e"
            : select(false);
    auto rows = co_await db->execSqlCoro(
        projection + filter +
            " ORDER BY lower(e.last_name),lower(e.first_name),e.id LIMIT "
            "$3::bigint OFFSET $4::bigint",
        who.tenantId, query, limit, offset);
    if (op == "list")
      r.result["capabilities"]["canWrite"] = canWrite;
    r.result["data"] = Json::arrayValue;
    for (const auto &row : rows)
      r.result["data"].append(parse(row["record"].as<std::string>()));
    r.result["totalCount"] = Json::Int64(totals[0]["total"].as<int64_t>());
  } else if (op == "get") {
    auto rows = co_await db->execSqlCoro(
        select(true) +
            " WHERE e.tenant_id=$1 AND e.id=$2 AND e.is_deleted=false",
        who.tenantId, id);
    if (rows.empty())
      co_return fail("not_found", "Employee not found.");
    r.result = parse(rows[0]["record"].as<std::string>());
  } else {
    if (op != "create") {
      auto current = co_await db->execSqlCoro(
          "SELECT version,employee_identifier FROM hr_employee_biodata WHERE "
          "tenant_id=$1 AND id=$2 AND is_deleted=false FOR UPDATE",
          who.tenantId, id);
      if (current.empty())
        co_return fail("not_found", "Employee not found.");
      if (current[0]["version"].as<int>() != b["version"].asInt())
        co_return fail("conflict", "Employee changed. Reload before saving.");
      if (op == "delete" ||
          current[0]["employee_identifier"].as<std::string>() !=
              b["employeeIdentifier"].asString()) {
        auto used = co_await db->execSqlCoro(
            "SELECT id FROM gl_payment_vouchers WHERE tenant_id=$1 AND "
            "employee_id=$2 AND is_deleted=false UNION ALL SELECT id FROM "
            "gl_imprests WHERE tenant_id=$1 AND employee_id=$2 AND "
            "is_deleted=false LIMIT 1",
            who.tenantId, id);
        if (!used.empty())
          co_return fail("conflict",
                         "A live voucher or imprest prevents deleting this "
                         "employee or changing the identifier.");
      }
    }
    if (op == "delete") {
      co_await db->execSqlCoro(
          "UPDATE hr_employee_biodata SET "
          "is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,last_"
          "modified_at=now(),last_modified_by_user_id=$3,version=version+1 "
          "WHERE tenant_id=$1 AND id=$2 AND is_deleted=false",
          who.tenantId, id, who.userId);
      r.result["id"] = id;
    } else {
      if (!b["userId"].isNull()) {
        auto linked = co_await db->execSqlCoro(
            "SELECT id FROM users WHERE tenant_id=$1 AND id=$2 AND "
            "is_deleted=false AND is_host_admin_user=false FOR SHARE",
            who.tenantId, b["userId"].asString());
        if (linked.empty())
          co_return fail(
              "validation_error",
              "Linked user must belong to this tenant and not be deleted.");
      }
      Json::Value record;
      std::string columns, values, assignments;
      for (const auto &f : fields) {
        record[f.column] = b[f.key];
        if (!columns.empty()) {
          columns += ",";
          values += ",";
          assignments += ",";
        }
        columns += f.column;
        values += "p." + std::string(f.column);
        assignments += std::string(f.column) + "=p." + f.column;
      }
      const std::string payload =
          Json::writeString(Json::StreamWriterBuilder{}, record);
      if (op == "create") {
        auto inserted = co_await db->execSqlCoro(
            "INSERT INTO hr_employee_biodata(tenant_id,created_by_user_id," +
                columns + ") SELECT $1::uuid,$2::uuid," + values +
                " FROM "
                "jsonb_populate_record(NULL::hr_employee_biodata,$3::jsonb) p "
                "RETURNING id",
            who.tenantId, who.userId, payload);
        id = inserted[0]["id"].as<std::string>();
      } else {
        co_await db->execSqlCoro(
            "UPDATE hr_employee_biodata e SET " + assignments +
                ",last_modified_at=now(),last_modified_by_user_id=$3,version=e."
                "version+1 FROM "
                "jsonb_populate_record(NULL::hr_employee_biodata,$4::jsonb) p "
                "WHERE e.tenant_id=$1 AND e.id=$2 AND e.is_deleted=false",
            who.tenantId, id, who.userId, payload);
      }
      auto saved = co_await db->execSqlCoro(
          select(true) +
              " WHERE e.tenant_id=$1 AND e.id=$2 AND e.is_deleted=false",
          who.tenantId, id);
      r.result = parse(saved[0]["record"].as<std::string>());
    }
  }
  r.success = true;
  co_return r;
}
} // namespace
drogon::Task<dto::BaseApiResponse>
EmployeeService::execute(std::string op, std::string id, Json::Value body,
                         int page, int size, std::string query,
                         utils::AuditIdentity who) {
  if (!uuid(who.tenantId) || !uuid(who.userId) ||
      who.tenantId == constants::kHostTenantId)
    co_return fail("unauthorized", "Tenant sign-in required.");
  const std::set<std::string> ops{"list",   "get",    "options",
                                  "create", "update", "delete"};
  if (!ops.count(op) || page < 1 || page > 1000000 || size < 1 || size > 100 ||
      !text(query, 200) ||
      ((op == "get" || op == "update" || op == "delete") && !uuid(id)))
    co_return fail("validation_error",
                   "Invalid operation, ID, paging or search.");
  if (op == "create" || op == "update") {
    const auto error = validate(body, op == "update");
    if (!error.empty())
      co_return fail("validation_error", error);
  }
  if (op == "delete" &&
      (!body.isObject() ||
       body.getMemberNames() != std::vector<std::string>{"version"} ||
       !body["version"].isInt() || body["version"].asInt() < 1 ||
       body["version"].asInt() == 2147483647))
    co_return fail("validation_error",
                   "A record version is required to delete.");
  try {
    auto db = drogon::app().getDbClient();
    if (op == "get" || op == "list" || op == "options")
      co_return co_await run(db, op, id, body, page, size, query, who);
    auto tx = co_await db->newTransactionCoro();
    dto::BaseApiResponse result;
    try {
      result = co_await run(tx, op, id, body, page, size, query, who);
    } catch (...) {
      tx->rollback();
      throw;
    }
    if (!result.success) {
      tx->rollback();
      co_return result;
    }
    if (!(co_await utils::CommitTransaction{std::move(tx)}))
      co_return fail("database_error", "Unable to commit employee changes.");
    co_return result;
  } catch (const drogon::orm::UniqueViolation &) {
    co_return fail("conflict", "Employee identifier is reserved or linked user "
                               "already has a live employee record.");
  } catch (const std::exception &) {
    co_return fail(
        "database_error",
        "Employee service unavailable. Verify migration 019 is installed.");
  }
}
} // namespace business_desk::domain_services
