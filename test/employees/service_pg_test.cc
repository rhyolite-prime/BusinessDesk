// Production employee service + real PostgreSQL; synchronous coroutine/role ORM
// seam.
#include "Roles.h"
#include "Tenants.h"
#include "Users.h"
#include "domain_services/hr/EmployeeFields.h"
#include "domain_services/hr/EmployeeService.h"

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
using business_desk::domain_services::EmployeeService;
using business_desk::utils::AuditIdentity;
const std::string tenant = "c6988bed-87d6-4058-ab95-5a833c27d513",
                  actor = "20000000-0000-4000-8000-000000000001";
const std::string other = "10000000-0000-4000-8000-000000000002",
                  actor2 = "20000000-0000-4000-8000-000000000002";
int checks = 0;
void check(bool value, const char *label) {
  if (!value)
    throw std::runtime_error(label);
  ++checks;
}
business_desk::dto::BaseApiResponse call(std::string op, std::string id = "",
                                         Json::Value body = {},
                                         AuditIdentity who = {tenant, actor},
                                         int page = 1, int size = 20,
                                         std::string query = "") {
  return EmployeeService::execute(op, id, body, page, size, query, who).get();
}
Json::Value editable(const Json::Value &result) {
  Json::Value b;
  for (const auto &f : business_desk::domain_services::employee_fields::fields)
    b[f.key] = result[f.key];
  b["version"] = result["version"];
  return b;
}
int main() {
  auto *db = PQconnectdb(std::getenv("EMPLOYEE_TEST_DATABASE_URL"));
  assert(PQstatus(db) == 0);
  bool failSavedRead = false;
  auto sql = [&](const std::string &query,
                 const std::vector<Json::Value> &params =
                     std::vector<Json::Value>{}) {
    if (failSavedRead &&
        query.find("AS record FROM hr_employee_biodata e WHERE") !=
            std::string::npos) {
      failSavedRead = false;
      throw std::runtime_error("injected serialization error");
    }
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
  sql("SET search_path TO employees_test");
  drogon::app().getDbClient()->execute = sql;
  auto list = call("list");
  check(list.success && list.result["totalCount"].asInt() == 5,
        "five seeded employee records visible");
  check(!list.result["data"][0].isMember("healthIssues") &&
            !list.result["data"][0].isMember("dateOfBirth"),
        "directory projection omits sensitive fields");
  auto page = call("list", "", {}, {tenant, actor}, 2, 2);
  check(page.success && page.result["data"].size() == 2,
        "bounded deterministic pagination");
  check(call("list", "", {}, {tenant, actor}, 1, 20, "DEMO-EMP-003")
                .result["totalCount"] == 1,
        "search exact identifier");
  check(call("list", "", {}, {other, actor2}).result["totalCount"] == 0,
        "cross-tenant directory isolation");
  const std::string seedId = "e0190000-0000-4000-8000-000000000001",
                    regular = "20000000-0000-4000-8000-000000000003";
  check(call("get", seedId, {}, {other, actor2}).error["code"] == "not_found",
        "cross-tenant detail denied");
  check(call("get", seedId, {}, {tenant, regular}).error["code"] == "forbidden",
        "ordinary tenant user cannot read biodata");
  auto options = call("options", "", {}, {tenant, regular});
  check(options.success && options.result["data"].size() == 5,
        "ordinary tenant user may load minimal payee identities");
  check(options.result["data"][0].size() == 4 &&
            !options.result["data"][0].isMember("personalEmail"),
        "payee options contain no personal/health data");
  // Explicit employee-read role, resolved through production PermissionService.
  using namespace drogon_model::BusinessDesk;
  using drogon::orm::CoroMapper;
  Users u;
  u.setId(regular);
  u.setTenantId(tenant);
  u.setIsDeleted(false);
  u.setIsActive(true);
  u.setIsLockedOut(false);
  u.setIsHostAdminUser(false);
  u.setRoles("[\"30000000-0000-4000-8000-000000000001\"]");
  u.setUserGroups("[]");
  CoroMapper<Users>::rows.push_back(u);
  Roles role;
  role.setId("30000000-0000-4000-8000-000000000001");
  role.setTenantId(tenant);
  role.setPermissions("[\"employees.read\"]");
  CoroMapper<Roles>::rows.push_back(role);
  check(call("get", seedId, {}, {tenant, regular}).success,
        "live employee-read role grants access");
  Json::Value b;
  b["employeeIdentifier"] = "EMP-CRUD-001";
  b["firstName"] = "Test";
  b["lastName"] = "Employee";
  b["dateOfBirth"] = "1990-02-28";
  b["dateAppointed"] = "2024-01-01";
  b["medicalExpensesLimit"] = "99999999999999.999999";
  b["height"] = "1.750";
  b["weight"] = "70.125";
  b["languages"] = Json::arrayValue;
  b["languages"].append("English");
  b["healthIssues"] = Json::arrayValue;
  b["healthIssues"].append("Synthetic test fixture");
  b["userId"] = regular;
  b["departmentName"] = "Finance";
  b["departmentId"] = "40000000-0000-4000-8000-000000000001";
  check(call("create", "", b, {tenant, regular}).error["code"] == "forbidden",
        "read-only role cannot create");
  auto created = call("create", "", b);
  check(created.success, "create employee");
  const std::string id = created.result["id"].asString();
  check(created.result["version"] == 1 &&
            created.result["createdByUserId"] == actor,
        "server creation audit and version");
  check(created.result["medicalExpensesLimit"] == "99999999999999.999999" &&
            created.result["height"] == "1.750",
        "exact decimals round-trip");
  check(created.result["languages"][0] == "English" &&
            created.result["healthIssues"][0] == "Synthetic test fixture",
        "JSONB collections round-trip");
  check(created.result["userId"] == regular &&
            created.result["departmentId"] == b["departmentId"],
        "UUID references round-trip");
  auto update = editable(created.result);
  update["otherName"] = "Updated";
  auto changed = call("update", id, update);
  check(changed.success && changed.result["version"] == 2,
        "update with optimistic version");
  check(changed.result["lastModifiedByUserId"] == actor, "server update audit");
  check(call("update", id, update).error["code"] == "conflict",
        "stale update rejected");
  auto forged = b;
  forged["tenantId"] = other;
  check(call("create", "", forged).error["code"] == "validation_error",
        "forged tenant rejected");
  forged = b;
  forged["createdByUserId"] = actor2;
  check(call("create", "", forged).error["code"] == "validation_error",
        "forged audit rejected");
  for (const auto &[key, value] :
       std::vector<std::pair<std::string, Json::Value>>{
           {"dateOfBirth", "2023-02-29"},
           {"dateOfBirth", "2999-01-01"},
           {"dateAppointed", "1980-01-01"},
           {"employeeIdentifier", std::string(21, 'x')},
           {"firstName", ""},
           {"height", "3.001"},
           {"weight", "1000.001"},
           {"medicalExpensesLimit", "1.0000001"},
           {"medicalExpensesLimit", 1.2},
           {"personalEmail", "bad-email"},
           {"status", -1},
           {"status", "0"},
           {"leaveDaysEntitled", 367},
           {"userId", actor2},
           {"userId", "not-a-uuid"},
           {"languages", "English"},
           {"employeePhoto", "javascript:alert(1)"}}) {
    auto bad = b;
    bad[key] = value;
    check(call("create", "", bad).error["code"] == "validation_error",
          "invalid field rejected");
  }
  auto dates = b;
  dates["driverLicenseIssueDate"] = "2025-01-01";
  dates["driverLicenseExpiryDate"] = "2024-01-01";
  check(call("create", "", dates).error["code"] == "validation_error",
        "licence chronology enforced");
  auto duplicate = b;
  duplicate["employeeIdentifier"] = "emp-crud-001";
  duplicate["userId"] = Json::nullValue;
  check(call("create", "", duplicate).error["code"] == "conflict",
        "case-insensitive identifier conflict");
  duplicate = b;
  duplicate["employeeIdentifier"] = "DIFFERENT";
  check(call("create", "", duplicate).error["code"] == "conflict",
        "linked-user uniqueness");
  Json::Value del;
  del["version"] = 2;
  check(call("delete", id, del, {other, actor2}).error["code"] == "not_found",
        "cross-tenant delete denied");
  check(call("delete", id).error["code"] == "validation_error",
        "delete requires version");
  del["version"] = 1;
  check(call("delete", id, del).error["code"] == "conflict",
        "stale delete denied");
  del["version"] = 2;
  sql("INSERT INTO gl_payment_vouchers(id,tenant_id,employee_id) "
      "VALUES('50000000-0000-4000-8000-000000000001',$1,$2)",
      {tenant, id});
  check(call("delete", id, del).error["code"] == "conflict",
        "live voucher protects employee");
  auto rename = editable(changed.result);
  rename["employeeIdentifier"] = "RENAMED";
  check(call("update", id, rename).error["code"] == "conflict",
        "live voucher protects employee identifier");
  bool foreignDenied = false;
  try {
    sql("INSERT INTO gl_payment_vouchers(id,tenant_id,employee_id) "
        "VALUES('50000000-0000-4000-8000-000000000002',$1,$2)",
        {other, id});
  } catch (...) {
    foreignDenied = true;
  }
  check(foreignDenied, "database rejects cross-tenant voucher links");
  sql("UPDATE gl_payment_vouchers SET is_deleted=true WHERE tenant_id=$1",
      {tenant});
  check(call("delete", id, del).success, "soft-delete employee");
  check(call("get", id).error["code"] == "not_found", "deleted detail hidden");
  check(call("list", "", {}, {tenant, actor}, 1, 20, "EMP-CRUD")
                .result["totalCount"] == 0,
        "deleted list hidden");
  auto audit = sql("SELECT is_deleted,version,deleted_by_user_id FROM "
                   "hr_employee_biodata WHERE id=$1",
                   {id});
  check(audit[0]["is_deleted"].as<bool>() &&
            audit[0]["version"].as<int>() == 3 &&
            audit[0]["deleted_by_user_id"].as<std::string>() == actor,
        "soft-delete audit persists");
  check(call("create", "", b).error["code"] == "conflict",
        "deleted identifier remains reserved");
  bool deletedDenied = false;
  try {
    sql("INSERT INTO gl_imprests(id,tenant_id,employee_id) "
        "VALUES('50000000-0000-4000-8000-000000000003',$1,$2)",
        {tenant, id});
  } catch (...) {
    deletedDenied = true;
  }
  check(deletedDenied, "database rejects new deleted-employee imprest links");
  auto pending = b;
  pending["employeeIdentifier"] = "ROLLBACK-EMP";
  pending["userId"] = Json::nullValue;
  drogon::TestTransaction::failCommit = true;
  auto uncommitted = call("create", "", pending);
  drogon::TestTransaction::failCommit = false;
  check(!uncommitted.success &&
            call("list", "", {}, {tenant, actor}, 1, 20, "ROLLBACK-EMP")
                    .result["totalCount"] == 0,
        "failed commit rolls back and never reports success");
  pending["employeeIdentifier"] = "EXCEPTION-EMP";
  failSavedRead = true;
  check(!call("create", "", pending).success &&
            call("list", "", {}, {tenant, actor}, 1, 20, "EXCEPTION-EMP")
                    .result["totalCount"] == 0,
        "exception after insert rolls back");
  sql("UPDATE users SET is_locked_out=true WHERE id=$1", {actor});
  check(call("list").error["code"] == "forbidden", "locked actor denied");
  sql("UPDATE users SET is_locked_out=false WHERE id=$1", {actor});
  sql("UPDATE tenants SET is_active=false WHERE id=$1", {tenant});
  check(call("list").error["code"] == "forbidden", "inactive tenant denied");
  sql("UPDATE tenants SET is_active=true WHERE id=$1", {tenant});
  check(call("list", "", {}, {}, 1, 20).error["code"] == "unauthorized",
        "missing tenant scope denied");
  check(call("get", "invalid").error["code"] == "validation_error",
        "invalid UUID denied");
  check(call("list", "", {}, {tenant, actor}, 1, 101).error["code"] ==
            "validation_error",
        "unbounded page size denied");
  check(call("list").result["capabilities"]["canWrite"].asBool(),
        "admin may write");
  check(!call("list", "", {}, {tenant, regular})
             .result["capabilities"]["canWrite"]
             .asBool(),
        "read-only role advertises no write capability");
  auto invalidArray = b;
  invalidArray["languages"] = Json::arrayValue;
  invalidArray["languages"].append(123);
  check(call("create", "", invalidArray).error["code"] == "validation_error",
        "array entries must be strings");
  invalidArray["languages"] = Json::arrayValue;
  for (int i = 0; i < 51; ++i)
    invalidArray["languages"].append("English");
  check(call("create", "", invalidArray).error["code"] == "validation_error",
        "bounded collection lengths");
  bool malformedDbArray = false;
  try {
    sql("UPDATE hr_employee_biodata SET health_issues='[123]'::jsonb WHERE "
        "id=$1",
        {seedId});
  } catch (...) {
    malformedDbArray = true;
  }
  check(malformedDbArray, "database enforces text-only JSONB collections");
  check(call("list", "", {}, {tenant, actor}, 1, 20, "%' OR 1=1--")
                .result["totalCount"] == 0,
        "search treats SQL/wildcard syntax as literal text");
  role.setPermissions("[\"employees.write\"]");
  CoroMapper<Roles>::rows[0] = role;
  auto writer = b;
  writer["employeeIdentifier"] = "WRITE-PERM-EMP";
  writer["userId"] = Json::nullValue;
  check(call("create", "", writer, {tenant, regular}).success,
        "employee-write role grants mutation access");
  check(call("list", "", {}, {tenant, regular}).success,
        "employee-write role includes directory read");
  role.setTenantId(other);
  CoroMapper<Roles>::rows[0] = role;
  check(call("get", seedId, {}, {tenant, regular}).error["code"] == "forbidden",
        "cross-tenant role cannot grant biodata access");
  role.setTenantId(tenant);
  role.setPermissions("[]");
  CoroMapper<Roles>::rows[0] = role;
  check(call("get", seedId, {}, {tenant, regular}).error["code"] == "forbidden",
        "role revocation takes effect immediately");
  sql("UPDATE users SET is_deleted=true WHERE id=$1", {actor});
  check(call("list").error["code"] == "forbidden",
        "deleted actor cannot access employee records");
  sql("UPDATE users SET is_deleted=false WHERE id=$1", {actor});
  std::cout << checks << " employee PostgreSQL checks passed\n";
  drogon::app().getDbClient()->execute = {};
  PQfinish(db);
}
