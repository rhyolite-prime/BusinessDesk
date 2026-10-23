// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport
// seam.
#include "domain_services/shared/SupplierService.h"

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
using business_desk::domain_services::SupplierService;
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
  auto *db = PQconnectdb(std::getenv("SUPPLIERS_TEST_DATABASE_URL"));
  assert(PQstatus(db) == 0);
  bool lockArmed = false, lockObserved = false, failSavedRead = false;
  std::string probeGroup;
  auto sql = [&](const std::string &query,
                 const std::vector<Json::Value> &params =
                     std::vector<Json::Value>{}) {
    if (failSavedRead && query.starts_with("SELECT jsonb_build_object") &&
        query.find("FROM core_suppliers s") != std::string::npos) {
      failSavedRead = false;
      throw std::runtime_error("Injected transport read failure");
    }
    if (std::getenv("PREF_DEBUG_SQL"))
      std::cerr << query << std::endl;
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
    if (lockArmed &&
        query.find("FROM core_supplier_groups") != std::string::npos &&
        query.find("FOR SHARE") != std::string::npos) {
      lockArmed = false;
      auto *probe = PQconnectdb(std::getenv("SUPPLIERS_TEST_DATABASE_URL"));
      auto *x = PQexecParams(probe, "SET search_path TO suppliers_test", 0,
                             nullptr, nullptr, nullptr, nullptr, 0);
      PQclear(x);
      x = PQexecParams(probe, "SET lock_timeout='50ms'", 0, nullptr, nullptr,
                       nullptr, nullptr, 0);
      PQclear(x);
      const char *values[] = {probeGroup.c_str(), tenant.c_str()};
      x = PQexecParams(probe,
                       "UPDATE core_supplier_groups SET name=name WHERE id=$1 "
                       "AND tenant_id=$2 AND is_deleted=false",
                       2, nullptr, values, nullptr, nullptr, 0);
      const auto *code = PQresultErrorField(x, 'C');
      lockObserved = code && std::string(code) == "55P03";
      PQclear(x);
      PQfinish(probe);
    }
    return rows;
  };
  sql("SET search_path TO suppliers_test");
  drogon::app().getDbClient()->execute = sql;
  auto call = [&](std::string op, bool group = false, std::string id = "",
                  Json::Value b = Json::Value{},
                  AuditIdentity who = AuditIdentity{tenant, actor},
                  int page = 1, int size = 20, std::string query = "",
                  std::string kind = "", std::string unit = "") {
    return SupplierService::execute(op, group, id, b, page, size, query, kind,
                                    unit, who)
        .get();
  };
  const std::string currency = "40000000-0000-4000-8000-000000000001",
                    unit = "30000000-0000-4000-8000-000000000001",
                    otherUnit = "30000000-0000-4000-8000-000000000002",
                    secondUnit = "30000000-0000-4000-8000-000000000003",
                    head = "60000000-0000-4000-8000-000000000001",
                    foreignHead = "60000000-0000-4000-8000-000000000002",
                    secondHead = "60000000-0000-4000-8000-000000000003";
  const std::string credit = "50000000-0000-4000-8000-000000000001",
                    debit = "50000000-0000-4000-8000-000000000002",
                    vat = "50000000-0000-4000-8000-000000000003",
                    irs = "50000000-0000-4000-8000-000000000004",
                    foreignCredit = "50000000-0000-4000-8000-000000000005",
                    secondAccount = "50000000-0000-4000-8000-000000000006";
  sql("INSERT INTO tenants(id,tenancy_name) VALUES($1,'acme'),($2,'other')",
      {tenant, other});
  sql("INSERT INTO users(id,tenant_id) VALUES($1,$3),($2,$4)",
      {actor, actor2, tenant, other});
  sql("INSERT INTO core_currencies(id,code,name) VALUES($1,'GHS','Ghana cedi')",
      {currency});
  sql("INSERT INTO "
      "core_accounting_units(id,tenant_id,code,name,base_currency_id) "
      "VALUES($1,$4,'HQ','Head office',$6),($2,$5,'HQ','Other "
      "tenant',$6),($3,$4,'SECOND','Second unit',$6)",
      {unit, otherUnit, secondUnit, tenant, other, currency});
  sql("INSERT INTO "
      "gl_account_groups(id,tenant_id,accounting_unit_id,name,standard_account_"
      "type) VALUES($1,$4,$6,'Liabilities',1),($2,$5,$7,'Other "
      "liability',1),($3,$4,$8,'Second head',0)",
      {head, foreignHead, secondHead, tenant, other, unit, otherUnit,
       secondUnit});
  auto account = [&](std::string id, std::string owner, std::string u,
                     std::string h, int type, std::string name) {
    sql("INSERT INTO "
        "gl_accounts(id,tenant_id,accounting_unit_id,account_group_id,account_"
        "number,account_name,standard_account_type) "
        "VALUES($1,$2,$3,$4,$5,$5,$6)",
        {id, owner, u, h, name, type});
  };
  account(credit, tenant, unit, head, 1, "AP liability");
  account(debit, tenant, unit, head, 0, "Purchases debit");
  account(vat, tenant, unit, head, 0, "VAT input");
  account(irs, tenant, unit, head, 1, "IRS withholding");
  account(foreignCredit, other, otherUnit, foreignHead, 1, "Foreign AP");
  account(secondAccount, tenant, secondUnit, secondHead, 0,
          "Second-unit debit");
  check(call("list", false, "", {}, {}).error["code"] == "unauthorized",
        "unauthenticated request denied");
  check(call("list", false, "", {}, {other, actor}).error["code"] ==
            "forbidden",
        "JWT actor must actually belong to tenant");
  sql("ALTER TABLE core_suppliers RENAME TO temporarily_missing_suppliers");
  check(call("list").error["code"] == "schema_not_ready",
        "missing migration fails closed");
  sql("ALTER TABLE temporarily_missing_suppliers RENAME TO core_suppliers");
  Json::Value gb;
  gb["name"] = " Local vendors ";
  auto createdGroup = call("create", true, "", gb);
  check(createdGroup.success && createdGroup.result["name"] == "Local vendors",
        "create and trim supplier group");
  auto group = createdGroup.result["id"].asString();
  auto duplicate = gb;
  duplicate["name"] = "local VENDORS";
  check(call("create", true, "", duplicate).error["code"] == "conflict",
        "case-folded group name uniqueness");
  auto foreignGroup = call("create", true, "", gb, {other, actor2});
  check(foreignGroup.success, "same group name allowed in another tenant");
  auto updatedGroup = gb;
  updatedGroup["version"] = 1;
  updatedGroup["name"] = "Domestic vendors";
  check(call("update", true, group, updatedGroup).success,
        "update group version");
  check(call("update", true, group, updatedGroup).error["code"] == "conflict",
        "stale group update rejected");
  for (auto op : {"get", "update", "delete"}) {
    auto command = updatedGroup;
    if (std::string(op) == "delete")
      command.removeMember("name");
    check(call(op, true, group, command, {other, actor2}).error["code"] ==
              "not_found",
          "cross-tenant group inaccessible");
  }
  Json::Value b;
  b["name"] = " Accra Supplies ";
  b["accountNumber"] = " SUP-001 ";
  b["supplierGroupId"] = group;
  b["statusId"] = "active";
  b["creditAccountId"] = credit;
  b["debitAccountId"] = debit;
  b["vatAccountId"] = vat;
  b["irsAccountId"] = irs;
  b["currencyId"] = currency;
  b["buyingRate"] = "1.2345678901";
  b["sellingRate"] = "1.4567890123";
  b["creditLimit"] = "99999999999999.123456";
  b["isResident"] = true;
  b["email"] = "supplier@example.test";
  b["phoneNo"] = "+233201234567";
  b["address"] = "Accra";
  b["contactPerson"] = "Ama";
  b["contactPersonPhone"] = "+233241234567";
  b["contactPersonEmail"] = "ama@example.test";
  b["vatNumber"] = "VAT-001";
  b["tinNumber"] = "TIN-001";
  b["taxOffice"] = "Accra central";
  probeGroup = group;
  lockArmed = true;
  auto created = call("create", false, "", b);
  if (!created.success)
    std::cerr << created.toJson() << std::endl;
  check(created.success, "supplier create with full audited relationships");
  for (auto key : {"phoneNo", "address", "contactPerson", "contactPersonPhone",
                   "contactPersonEmail", "vatNumber", "tinNumber", "taxOffice",
                   "vatAccountId", "debitAccountId", "irsAccountId",
                   "currencyId", "sellingRate"})
    check(created.result[key] == b[key], "expanded supplier field round trips");
  auto id = created.result["id"].asString();
  check(lockObserved,
        "supplier mutation locks its group against concurrent soft deletion");
  check(created.result["name"] == "Accra Supplies" &&
            created.result["accountNumber"] == "SUP-001",
        "supplier identity normalized");
  check(created.result["buyingRate"] == "1.2345678901" &&
            created.result["creditLimit"] == "99999999999999.123456",
        "financial decimals preserved exactly as strings");
  check(created.result["balance"] == "0.000000",
        "new supplier balance is server controlled zero");
  check(created.result["supplierGroupName"] == "Domestic vendors" &&
            created.result["creditAccountName"] == "AP liability" &&
            created.result["currencyCode"] == "GHS" &&
            created.result["statusName"] == "Active",
        "relationship/status labels are server-derived");
  check(sql("SELECT created_by_user_id FROM core_suppliers WHERE id=$1 AND "
            "is_deleted=false",
            {id})[0]
                .value["created_by_user_id"] == actor,
        "create auditing uses JWT actor");
  for (auto key :
       {"balance", "tenantId", "id", "createdByUserId", "supplierGroupName",
        "statusName", "currencyName", "creditAccountName", "isDeleted"}) {
    auto bad = b;
    bad[key] = "spoofed";
    check(call("create", false, "", bad).error["code"] == "validation_error",
          "reject balance, scope, audit and derived fields");
  }
  for (auto key : {"buyingRate", "sellingRate", "creditLimit"}) {
    auto bad = b;
    bad[key] = 1.234;
    check(!call("create", false, "", bad).success,
          "financial numbers require exact decimal strings");
    bad[key] = "1e2";
    check(!call("create", false, "", bad).success,
          "decimal exponent notation rejected");
  }
  auto bad = b;
  bad["buyingRate"] = "0.0000000000";
  check(!call("create", false, "", bad).success, "zero exchange rate rejected");
  bad = b;
  bad["creditLimit"] = "-1";
  check(!call("create", false, "", bad).success,
        "negative credit limit rejected");
  bad = b;
  bad["sellingRate"] = "1.12345678901";
  check(!call("create", false, "", bad).success,
        "excess decimal precision rejected");
  bad = b;
  bad["email"] = "invalid@";
  check(!call("create", false, "", bad).success, "invalid email rejected");
  bad = b;
  bad["name"] = std::string(201, 'x');
  check(!call("create", false, "", bad).success, "name length bounded");
  bad = b;
  bad["supplierGroupId"] = foreignGroup.result["id"];
  check(!call("create", false, "", bad).success,
        "foreign supplier group rejected");
  bad = b;
  bad["creditAccountId"] = foreignCredit;
  check(!call("create", false, "", bad).success, "foreign GL account rejected");
  bad = b;
  bad["debitAccountId"] = secondAccount;
  check(!call("create", false, "", bad).success,
        "mixed-unit posting defaults rejected");
  bad = b;
  bad["creditAccountId"] = debit;
  check(!call("create", false, "", bad).success,
        "AP credit must be a liability");
  check(call("create", false, "", b).error["code"] == "conflict",
        "supplier account number unique");
  auto listed = call("list", false, "", {}, {tenant, actor}, 1, 1, "sup-001");
  check(listed.success && listed.result["data"].size() == 1 &&
            listed.result["totalCount"] == 1,
        "list search and real bigint binary binds");
  check(
      call("list", false, "", {}, {tenant, actor}, 2, 1).result["data"].empty(),
      "pagination offsets applied");
  check(call("list", false, "", {}, {other, actor2}).result["totalCount"] == 0,
        "tenant isolation on list");
  auto edit = b;
  edit["version"] = 1;
  edit["contactPerson"] = "Ama Mensah";
  edit["statusId"] = "on_hold";
  auto updated = call("update", false, id, edit);
  check(updated.success && updated.result["version"] == 2 &&
            updated.result["statusName"] == "On hold",
        "update supplier and status labels");
  check(call("update", false, id, edit).error["code"] == "conflict",
        "stale supplier update rejected");
  for (auto op : {"get", "update", "delete"}) {
    auto input = edit;
    input["version"] = 2;
    if (std::string(op) == "delete") {
      input = Json::objectValue;
      input["version"] = 2;
    }
    check(call(op, false, id, input, {other, actor2}).error["code"] ==
              "not_found",
          "foreign supplier inaccessible");
  }
  check(call("delete", true, group).error["code"] == "conflict",
        "group deletion blocked while live suppliers exist");
  auto options =
      call("options", false, "", {}, {tenant, actor}, 1, 20, "", "credits");
  check(options.success && options.result["data"].size() == 2 &&
            options.result["data"][0]["unitId"] == unit,
        "credit lookup excludes assets and foreign tenant accounts");
  check(call("options", false, "", {}, {tenant, actor}, 1, 20, "VAT",
             "accounts", unit)
                .result["data"]
                .size() == 1,
        "paged account lookups respect search and unit");
  check(call("options", false, "", {}, {tenant, actor}, 1, 20, "", "groups")
                .result["data"]
                .size() == 1,
        "group lookup tenant scoped");
  auto rollbackBody = b;
  rollbackBody["accountNumber"] = "SUP-ROLLBACK";
  failSavedRead = true;
  check(call("create", false, "", rollbackBody).error["code"] ==
            "database_error",
        "post-insert transport error reports failure");
  check(sql("SELECT count(*)::int AS n FROM core_suppliers WHERE tenant_id=$1 "
            "AND account_number='SUP-ROLLBACK' AND is_deleted=false",
            {tenant})[0]
                .value["n"] == 0,
        "C++ exception after insert explicitly rolls back rather than "
        "auto-committing");
  bool protectedAccount = false;
  try {
    sql("UPDATE gl_accounts SET is_deleted=true WHERE id=$1 AND "
        "is_deleted=false",
        {credit});
  } catch (const std::exception &) {
    protectedAccount = true;
  }
  check(protectedAccount,
        "existing GL deletion cannot orphan supplier configuration");
  bool protectedCurrency = false;
  try {
    sql("UPDATE core_currencies SET is_active=false WHERE id=$1 AND "
        "is_deleted=false",
        {currency});
  } catch (const std::exception &) {
    protectedCurrency = true;
  }
  check(protectedCurrency,
        "global currency deactivation respects supplier references");
  sql("UPDATE core_suppliers SET balance=12.345678 WHERE id=$1 AND "
      "is_deleted=false",
      {id});
  check(call("delete", false, id).error["code"] == "conflict",
        "nonzero supplier cannot be deleted");
  edit["version"] = 2;
  edit["debitAccountId"] = vat;
  check(call("update", false, id, edit).error["code"] == "conflict",
        "nonzero balance prevents posting-account reassignment");
  edit["debitAccountId"] = debit;
  check(call("update", false, id, edit).success,
        "contact changes do not rewrite nonzero balances");
  check(call("get", false, id).result["balance"] == "12.345678",
        "supplier update preserves exact accounting balance");
  sql("UPDATE core_suppliers SET balance=0 WHERE id=$1 AND is_deleted=false",
      {id});
  auto voucher = [&](std::string owner, std::string u, std::string number) {
    return sql("INSERT INTO "
               "gl_payment_vouchers(tenant_id,accounting_unit_id,batch_number,"
               "voucher_entry_date,mode_of_payment,currency_id,supplier_id) "
               "VALUES($1,$2,$3,current_date,'bank',$4,$5) RETURNING id",
               {owner, u, number, currency, id});
  };
  auto voucherId = voucher(tenant, unit, "SUPPAY")[0].value["id"].asString();
  check(call("delete", false, id).error["code"] == "conflict",
        "live payment voucher prevents supplier deletion even when balance is "
        "zero");
  edit["version"] = 3;
  edit["accountNumber"] = "SUP-002";
  check(call("update", false, id, edit).error["code"] == "conflict",
        "payment history protects supplier accounting identity");
  bool foreignVoucherBlocked = false;
  try {
    voucher(other, otherUnit, "FOREIGN");
  } catch (const std::exception &) {
    foreignVoucherBlocked = true;
  }
  check(foreignVoucherBlocked,
        "new payment vouchers cannot reference another tenant's supplier");
  bool mixedVoucherBlocked = false;
  try {
    voucher(tenant, secondUnit, "WRONG_UNIT");
  } catch (const std::exception &) {
    mixedVoucherBlocked = true;
  }
  check(mixedVoucherBlocked,
        "new voucher must use the supplier posting accounting unit");
  sql("UPDATE gl_payment_vouchers SET is_deleted=true WHERE tenant_id=$1 AND "
      "id=$2 AND is_deleted=false",
      {tenant, voucherId});
  drogon::TestTransaction::failCommit = true;
  Json::Value staleDelete;
  staleDelete["version"] = call("get", false, id).result["version"].asInt() + 1;
  check(call("delete", false, id, staleDelete).error["code"] == "conflict",
        "stale supplier delete rejected");
  auto failed = call("delete", false, id);
  drogon::TestTransaction::failCommit = false;
  check(!failed.success && call("get", false, id).success,
        "failed commit rolls back supplier deletion");
  check(call("delete", false, id).success, "supplier soft delete");
  check(call("get", false, id).error["code"] == "not_found" &&
            call("list").result["data"].empty(),
        "ordinary queries hide soft-deleted suppliers");
  check(call("create", false, "", b).error["code"] == "conflict",
        "archived account number remains reserved outside reset");
  bool archivedVoucherBlocked = false;
  try {
    voucher(tenant, unit, "ARCHIVED");
  } catch (const std::exception &) {
    archivedVoucherBlocked = true;
  }
  check(archivedVoucherBlocked,
        "new payment vouchers cannot reference a deleted supplier");
  check(sql("SELECT deleted_by_user_id,is_deleted FROM core_suppliers WHERE "
            "id=$1",
            {id})[0]
                .value["deleted_by_user_id"] == actor,
        "soft deletion records trusted actor");
  check(call("delete", true, group).success &&
            call("list", true).result["data"].empty(),
        "empty group soft deletion");
  check(call("options", false, "", {}, {tenant, actor}, 1, 20, "", "groups")
            .result["data"]
            .empty(),
        "deleted groups excluded from lookups");
  sql("UPDATE users SET is_active=false WHERE id=$1 AND is_deleted=false",
      {actor});
  check(call("list").error["code"] == "forbidden",
        "deactivated actor cannot read or mutate suppliers");
  sql("UPDATE users SET is_active=true WHERE id=$1 AND is_deleted=false",
      {actor});
  auto preview = sql("SELECT "
                     "tenant_reset_snapshot($1,ARRAY['core_supplier_groups'])::"
                     "text AS snapshot",
                     {tenant})[0]
                     .value["snapshot"]
                     .asString();
  check(preview.find("core_suppliers") != std::string::npos &&
            preview.find("gl_payment_vouchers") != std::string::npos,
        "supplier reset registry includes dependent suppliers, including "
        "archived rows");
  check(!call("get", false, "bad-id").success &&
            !call("list", false, "", {}, {tenant, actor}, 0).success,
        "invalid IDs and pagination rejected");
  auto allPreview =
      sql("SELECT tenant_reset_snapshot($1,NULL)::text AS snapshot",
          {tenant})[0]
          .value["snapshot"]
          .asString();
  Json::Value allPlan;
  Json::Reader reader;
  reader.parse(allPreview, allPlan);
  check(allPlan["blocked"].empty(),
        "whole-tenant preview accepts supplier schema and update-only "
        "preservation triggers");
  auto plan =
      sql("INSERT INTO "
          "core_tenant_reset_plans(tenant_id,created_by_user_id,requested_"
          "tables,snapshot) "
          "VALUES($1,$2,ARRAY['core_supplier_groups'],$3::jsonb) RETURNING id",
          {tenant, actor, preview})[0]
          .value["id"]
          .asString();
  sql("SELECT tenant_reset_apply($1,$2,$3,'Clear supplier training fixtures')",
      {tenant, actor, plan});
  check(sql("SELECT count(*)::int AS n FROM core_suppliers WHERE tenant_id=$1",
            {tenant})[0]
                    .value["n"] == 0 &&
            sql("SELECT count(*)::int AS n FROM core_supplier_groups WHERE "
                "tenant_id=$1",
                {tenant})[0]
                    .value["n"] == 0,
        "confirmed registry reset removes archived suppliers and groups "
        "together");
  check(call("get", true, foreignGroup.result["id"].asString(), {},
             {other, actor2})
            .success,
        "supplier initialization leaves another tenant's group intact");
  auto reGroup = call("create", true, "", gb);
  b["supplierGroupId"] = reGroup.result["id"];
  check(call("create", false, "", b).success,
        "confirmed initialization releases archived supplier account number "
        "for reuse");
  std::cout << checks << " supplier PostgreSQL/service checks passed\n";
  PQfinish(db);
}
