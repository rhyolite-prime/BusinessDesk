// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport
// seam.
#include "domain_services/gl/JournalService.h"
#include "domain_services/gl/SupplierVoucherService.h"
#include "domain_services/gl/VoucherMath.h"
#include "domain_services/shared/CustomerService.h"

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
using business_desk::domain_services::JournalService;
using business_desk::domain_services::SupplierVoucherService;
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
  auto *db = PQconnectdb(std::getenv("JOURNAL_TEST_DATABASE_URL"));
  assert(PQstatus(db) == 0);
  bool failAfterJournal = false;
  auto sql = [&](const std::string &query,
                 const std::vector<Json::Value> &params =
                     std::vector<Json::Value>{}) {
    if (failAfterJournal &&
        query.find("SET status='posted',is_posted=true") != std::string::npos) {
      failAfterJournal = false;
      throw std::runtime_error("injected after journal posting");
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
  sql("SET search_path TO suppliers_test");
  drogon::app().getDbClient()->execute = sql;
  const std::string unit = "30000000-0000-4000-8000-000000000001",
                    currency = "40000000-0000-4000-8000-000000000001",
                    usd = "40000000-0000-4000-8000-000000000002",
                    account = "50000000-0000-4000-8000-000000000001",
                    bank = "50000000-0000-4000-8000-000000000002",
                    tax = "50000000-0000-4000-8000-000000000003",
                    supplier = "60000000-0000-4000-8000-000000000001",
                    period = "70000000-0000-4000-8000-000000000001",
                    bankRecord = "80000000-0000-4000-8000-000000000001",
                    center = "90000000-0000-4000-8000-000000000001";
  sql("INSERT INTO tenants(id,tenancy_name) VALUES($1,'Test'),($2,'Other')",
      {tenant, other});
  sql("INSERT INTO users(id,tenant_id,first_name,is_tenant_admin_user) "
      "VALUES($1,$3,'Admin',true),($2,$3,'User',false)",
      {actor, actor2, tenant});
  sql("INSERT INTO core_currencies(id,code,name) "
      "VALUES($1,'GHS','Cedi'),($2,'USD','Dollar')",
      {currency, usd});
  sql("INSERT INTO "
      "core_company_profiles(tenant_id,company_name,email,default_currency_id,"
      "created_by_user_id) VALUES($1,'Test','test@example.test',$2,$3)",
      {tenant, currency, actor});
  sql("INSERT INTO "
      "core_accounting_units(id,tenant_id,code,name,base_currency_id) "
      "VALUES($1,$2,'HQ','Unit',$3)",
      {unit, tenant, currency});
  auto group = sql("INSERT INTO "
                   "gl_account_groups(tenant_id,accounting_unit_id,name,"
                   "standard_account_type) VALUES($1,$2,'Test',0) RETURNING id",
                   {tenant, unit})[0]
                   .value["id"];
  for (const auto &a : {account, bank, tax})
    sql("INSERT INTO "
        "gl_accounts(id,tenant_id,accounting_unit_id,account_group_id,account_"
        "number,account_name,currency_id,standard_account_type) "
        "VALUES($1,$2,$3,$4,$6,'Test GL',$5,0)",
        {a, tenant, unit, group, currency, a});
  auto sg =
      sql("INSERT INTO core_supplier_groups(tenant_id,name,created_by_user_id) "
          "VALUES($1,'Trade',$2) RETURNING id",
          {tenant, actor})[0]
          .value["id"];
  sql("INSERT INTO "
      "core_suppliers(id,tenant_id,account_number,supplier_group_id,status,vat_"
      "account_id,credit_account_id,debit_account_id,tin_number,name,email,"
      "phone_no,address,contact_person,contact_person_phone,contact_person_"
      "email,vat_number,currency_id,credit_limit,irs_"
      "account_id,is_resident,tax_office,created_by_user_id) "
      "VALUES($1,$2,'SUP1',$3,'active',$4,$4,$4,'','Supplier','','','','','',''"
      ",'',$5,0,$4,true,'',$6)",
      {supplier, tenant, sg, account, currency, actor});
  sql("INSERT INTO "
      "gl_bank_accounts(id,tenant_id,accounting_unit_id,account_id,bank_name,"
      "account_number,currency_id) VALUES($1,$2,$3,$4,'Bank','123',$5)",
      {bankRecord, tenant, unit, bank, currency});
  sql("INSERT INTO core_cost_centers(id,tenant_id,name,created_by_user_id) "
      "VALUES($1,$2,'Operations',$3)",
      {center, tenant, actor});
  sql("INSERT INTO "
      "gl_accounting_periods(id,tenant_id,accounting_unit_id,period,period_"
      "start_date,period_end_date) "
      "VALUES($1,$2,$3,202610,'2026-10-01','2026-10-31')",
      {period, tenant, unit});
  auto call = [&](std::string op, std::string id = "",
                  Json::Value b = Json::Value{},
                  AuditIdentity who = {tenant, actor}) {
    auto r = SupplierVoucherService::execute(op, id, b, who).get();
    return r;
  };
  auto count = [&](std::string table) {
    return sql("SELECT count(*)::int AS n FROM " + table +
                   " WHERE tenant_id=$1",
               {tenant})[0]
        .value["n"]
        .asInt();
  };
  Json::Value input;
  input["accountingUnitId"] = unit;
  input["type"] = "supplier-payment";
  input["payeeId"] = supplier;
  input["entryDate"] = "2026-10-20";
  input["paymentDate"] = "2026-10-21";
  input["bankAccountId"] = bankRecord;
  input["bankGlAccountId"] = bank;
  input["mode"] = "Bank transfer";
  input["currencyCode"] = "GHS";
  input["exchangeRate"] = "1";
  input["multiCurrency"] = false;
  input["description"] = "Supplier tax payment";
  input["periodId"] = period;
  input["requestId"] = "a0000000-0000-4000-8000-000000000001";
  input["lines"] = Json::arrayValue;
  input["retentions"] = Json::arrayValue;
  input["taxes"] = business_desk::voucher_math::defaults();
  Json::Value line;
  line["accountId"] = account;
  line["organizationUnitId"] = center;
  line["localAmount"] = "120";
  line["foreignAmount"] = "0";
  line["isWithhold"] = true;
  line["description"] = "Expense";
  line["referenceNumber"] = "REF-1";
  input["lines"].append(line);
  for (auto [k, r] : std::vector<std::pair<std::string, std::string>>{
           {"nhil", "2.5"},
           {"getfund", "2.5"},
           {"vat", "15"},
           {"incomeWithholding", "5"},
           {"vatWithholding", "7"}}) {
    input["taxes"][k]["enabled"] = true;
    input["taxes"][k]["rate"] = r;
    if (k.ends_with("Withholding"))
      input["taxes"][k]["accountId"] = tax;
  }
  Json::Value retention;
  retention["accountId"] = tax;
  retention["description"] = "Retention";
  retention["isPercentage"] = true;
  retention["value"] = "10";
  input["retentions"].append(retention);
  auto preview = call("preview", "", input);
  if (!preview.success)
    std::cerr << preview.toJson() << std::endl;
  check(preview.success, "authoritative preview");
  auto c = preview.result["taxSummary"];
  check(c["gross"] == "120.000000" && c["base"] == "100.000000" &&
            c["vat"] == "15.000000" && c["incomeWithholding"] == "5.000000" &&
            c["vatWithholding"] == "7.000000" && c["retained"] == "12.000000" &&
            c["net"] == "96.000000",
        "all taxes and retention exact");
  check(count("gl_journal_batches") == 0 && count("gl_account_balances") == 0,
        "preview does not persist");
  check(JournalService::execute("validate", "", unit,
                                preview.result["proposedJournal"],
                                {tenant, actor})
            .get()
            .success,
        "proposal has original journal payload contract");
  check(!call("create", "", input, {}).success &&
            !call("create", "", input, {other, actor}).success,
        "anonymous and cross tenant denied");
  auto saved = call("create", "", input);
  if (!saved.success)
    std::cerr << saved.toJson() << std::endl;
  check(saved.success, "persist full voucher");
  auto v = saved.result;
  const std::string id = v["id"].asString();
  check(v["taxSummary"] == c &&
            v["proposedJournal"] == preview.result["proposedJournal"],
        "saved proposal agrees with preview");
  check(count("gl_payment_voucher_lines") == 1 &&
            count("gl_payment_voucher_retentions") == 1,
        "normalized children persisted");
  Json::Value filter;
  filter["search"] = "supplier";
  filter["status"] = "Draft";
  check(call("list", "", filter).result["total"].asInt() == 1,
        "register searches case-insensitively and filters status");
  filter["type"] = "employee-payment";
  check(call("list", "", filter).result["total"].asInt() == 0,
        "register type filter cannot leak unsupported records");
  auto replay = call("create", "", input);
  check(replay.success && replay.result["id"] == id &&
            count("gl_payment_vouchers") == 1,
        "create replay cannot duplicate voucher");
  auto changed = input;
  changed["description"] = "Changed";
  check(call("create", "", changed).error["code"] == "conflict",
        "same request cannot change payload");
  auto command = [&]() {
    Json::Value b;
    b["version"] = v["version"];
    return b;
  };
  check(!call("post", id, command()).success, "draft cannot post");
  auto update = input;
  update["version"] = v["version"];
  update["description"] = "Updated tax voucher";
  auto updated = call("update", id, update);
  check(updated.success, "update draft");
  v = updated.result;
  check(!call("update", id, update).success, "stale version denied");
  check(sql("SELECT count(*)::int n FROM gl_payment_voucher_lines WHERE "
            "is_deleted=false")[0]
                    .value["n"] == 1 &&
            count("gl_payment_voucher_lines") == 2,
        "old allocation soft archived");
  v = call("submit", id, command()).result;
  check(v["status"] == "Pending approval", "submit pending");
  check(!call("approve", id, command(), {tenant, actor2}).success,
        "non-admin cannot approve");
  v = call("approve", id, command()).result;
  check(v["status"] == "Approved", "approve voucher");
  sql("UPDATE gl_accounts SET status='inactive' WHERE id=$1", {tax});
  check(!call("post", id, command()).success &&
            count("gl_journal_batches") == 0,
        "inactive withholding GL revalidated before posting");
  sql("UPDATE gl_accounts SET status='active' WHERE id=$1", {tax});
  sql("UPDATE gl_bank_accounts SET is_active=false WHERE id=$1", {bankRecord});
  check(!call("post", id, command()).success &&
            count("gl_journal_batches") == 0,
        "inactive linked bank blocks posting");
  sql("UPDATE gl_bank_accounts SET is_active=true WHERE id=$1", {bankRecord});
  sql("UPDATE core_cost_centers SET is_deleted=true WHERE id=$1", {center});
  check(!call("post", id, command()).success &&
            count("gl_journal_batches") == 0,
        "deleted organization blocks posting");
  sql("UPDATE core_cost_centers SET is_deleted=false WHERE id=$1", {center});
  sql("UPDATE users SET is_active=false WHERE id=$1", {actor});
  check(!call("post", id, command()).success,
        "revoked user cannot post with an old token");
  sql("UPDATE users SET is_active=true WHERE id=$1", {actor});
  sql("UPDATE gl_accounting_periods SET status='closed' WHERE id=$1", {period});
  auto denied = call("post", id, command());
  check(!denied.success && count("gl_journal_batches") == 0 &&
            count("gl_account_balances") == 0,
        "closed period rolls back journal and balances");
  sql("UPDATE gl_accounting_periods SET status='open' WHERE id=$1", {period});
  sql("INSERT INTO "
      "gl_approval_policies(tenant_id,accounting_unit_id,transaction_type,"
      "minimum_amount) VALUES($1,$2,'journal',1)",
      {tenant, unit});
  check(call("post", id, command()).error["code"] == "approval_required" &&
            count("gl_journal_batches") == 0,
        "existing journal approval policy preserved");
  sql("UPDATE gl_approval_policies SET is_active=false WHERE tenant_id=$1",
      {tenant});
  failAfterJournal = true;
  check(!call("post", id, command()).success &&
            count("gl_journal_batches") == 0 &&
            count("gl_journal_history") == 0 &&
            count("gl_account_balances") == 0,
        "failure after journal ceremony rolls back all effects");
  check(call("get", id).result["status"] == "Approved",
        "voucher remains approved after rollback");
  drogon::TestTransaction::failCommit = true;
  check(!call("post", id, command()).success, "commit failure reported");
  drogon::TestTransaction::failCommit = false;
  check(count("gl_journal_batches") == 0 && count("gl_account_balances") == 0,
        "commit failure leaves no balances");
  auto posted = call("post", id, command());
  if (!posted.success)
    std::cerr << posted.toJson() << std::endl;
  check(posted.success, "post voucher atomically");
  auto stale = command();
  v = posted.result;
  check(v["status"] == "Posted" && !v["journalId"].isNull(),
        "posted voucher linked to posted journal");
  auto journal = JournalService::execute("get", v["journalId"].asString(), unit,
                                         {}, {tenant, actor})
                     .get();
  check(journal.success && journal.result["status"] == "posted" &&
            journal.result["totalDebit"] == "120.000000" &&
            journal.result["totalCredit"] == "120.000000",
        "posted balanced journal through normal service");
  check(count("gl_journal_history") == 1 && count("gl_account_balances") == 3,
        "journal history and account balances updated");
  check(sql("SELECT debit_balance::text d,credit_balance::text c FROM "
            "gl_account_balances WHERE account_id=$1",
            {account})[0]
                .value["d"] == "120.000000",
        "debit ledger balance exact");
  check(sql("SELECT credit_balance::text c FROM gl_account_balances WHERE "
            "account_id=$1",
            {tax})[0]
                .value["c"] == "24.000000",
        "all deductions credited to ledger");
  check(call("post", id, stale).success && count("gl_journal_batches") == 1 &&
            count("gl_journal_history") == 1,
        "retry with pre-post version returns posted voucher without "
        "duplicating balances");
  check(!call("delete", id, command()).success &&
            !call("update", id, update).success,
        "posted immutable");
  check(!call("get", id, {}, {other, actor}).success,
        "cross tenant read denied");
  auto bad = input;
  bad["requestId"] = "a0000000-0000-4000-8000-000000000002";
  bad["taxes"]["cst"]["enabled"] = true;
  bad["taxes"]["cst"]["rate"] = "5";
  bad["taxes"]["covid"]["enabled"] = true;
  bad["taxes"]["covid"]["rate"] = "1";
  check(!call("create", "", bad).success,
        "CST COVID mutual exclusion enforced on server");
  bad = input;
  bad["type"] = "unknown-type";
  check(!call("create", "", bad).success,
        "unsupported voucher type never fake saves");
  bad = input;
  bad["totalAmount"] = "1";
  check(!call("create", "", bad).success, "client totals rejected");
  bad = input;
  bad["requestId"] = "a0000000-0000-4000-8000-000000000003";
  bad["currencyCode"] = "USD";
  bad["multiCurrency"] = true;
  bad["exchangeRate"] = "12";
  bad["lines"][0]["foreignAmount"] = "10";
  auto fx = call("create", "", bad);
  check(fx.success && fx.result["totalAmount"] == "120.000000" &&
            fx.result["proposedJournal"]["lines"][0]["currencyId"] ==
                currency &&
            fx.result["proposedJournal"]["lines"][0]["exchangeRate"] ==
                "1.0000000000",
        "FX converts only once into base-currency journal");
  Json::Value del;
  del["version"] = fx.result["version"];
  check(call("delete", fx.result["id"].asString(), del).success,
        "delete draft soft deletes children");
  check(!call("get", fx.result["id"].asString()).success,
        "deleted voucher excluded");
  // Employee payments share authoritative math and the journal ceremony,
  // but never accept retentions or conflate withholding with imprest.
  const std::string employee = "60000000-0000-4000-8000-000000000011";
  sql("INSERT INTO "
      "hr_employee_biodata(id,tenant_id,employee_identifier,first_name,last_"
      "name,date_appointed,date_of_birth) "
      "VALUES($1,$2,'EMP-001','Ama','Mensah','2020-01-01','1990-01-01')",
      {employee, tenant});
  auto emp = input;
  emp["type"] = "employee-payment";
  emp["payeeId"] = employee;
  emp["taxType"] = "Professional services";
  emp["requestId"] = "a0000000-0000-4000-8000-000000000011";
  emp["lines"][0]["isImprest"] = true;
  check(!call("create", "", emp).success,
        "employee retentions rejected server-side");
  emp["retentions"] = Json::arrayValue;
  auto ep = call("preview", "", emp);
  check(ep.success && ep.result["taxSummary"]["net"] == "108.000000",
        "employee legacy tax calculation without retention");
  auto ec = call("create", "", emp);
  if (!ec.success)
    std::cerr << ec.toJson() << std::endl;
  check(ec.success && ec.result["batchNumber"].asString().starts_with("EPV-") &&
            ec.result["payeeName"] == "Ama Mensah",
        "create employee voucher with server-derived payee");
  check(ec.result["taxType"] == "Professional services",
        "employee tax classification round trips");
  Json::Value employeeFilter;
  employeeFilter["type"] = "employee-payment";
  check(call("list", "", employeeFilter).result["items"].size() == 1,
        "employee register is filtered by type");
  auto eid = ec.result["id"].asString();
  auto erow = sql("SELECT employee_id::text e,supplier_id::text s FROM "
                  "gl_payment_vouchers WHERE id=$1",
                  {eid})[0]
                  .value;
  check(erow["e"] == employee && erow["s"].isNull(),
        "employee and supplier database links are distinct");
  auto flags =
      sql("SELECT has_imprest i,withhold w FROM gl_payment_voucher_lines WHERE "
          "payment_voucher_id=$1 AND is_deleted=false",
          {eid})[0]
          .value;
  check(flags["i"].asBool() && flags["w"].asBool(),
        "both employee flags persisted independently");
  check(call("create", "", emp).result["id"] == eid,
        "employee create retry is idempotent");
  auto eu = emp;
  eu.removeMember("requestId");
  eu["version"] = ec.result["version"];
  eu["lines"][0]["isImprest"] = false;
  auto edited = call("update", eid, eu);
  check(edited.success && !edited.result["lines"][0]["isImprest"].asBool() &&
            edited.result["lines"][0]["isWithhold"].asBool(),
        "edit employee flags independently");
  check(!call("update", eid, eu).success, "employee stale update rejected");
  auto cmd = [&] {
    Json::Value x;
    x["version"] = call("get", eid).result["version"];
    return x;
  };
  check(!call("post", eid, cmd()).success,
        "employee posting requires approval");
  check(call("submit", eid, cmd()).success, "submit employee voucher");
  check(!call("approve", eid, cmd(), {tenant, actor2}).success,
        "employee approval requires tenant administrator");
  check(call("approve", eid, cmd()).success, "approve employee voucher");
  const auto batchesBefore = count("gl_journal_batches");
  auto bankCredit = [&] {
    return sql("SELECT credit_balance::text c FROM gl_account_balances WHERE "
               "account_id=$1",
               {bank})[0]
        .value["c"];
  };
  const auto bankBefore = bankCredit();
  failAfterJournal = true;
  check(!call("post", eid, cmd()).success &&
            count("gl_journal_batches") == batchesBefore,
        "employee journal and balances roll back together");
  check(bankCredit() == bankBefore,
        "employee failed posting does not alter existing bank balance");
  auto eposted = call("post", eid, cmd());
  check(eposted.success && eposted.result["status"] == "Posted",
        "employee voucher posts through journal service");
  auto ej =
      JournalService::execute("get", eposted.result["journalId"].asString(),
                              unit, {}, {tenant, actor})
          .get();
  check(ej.success && ej.result["status"] == "posted" &&
            ej.result["totalDebit"] == "120.000000" &&
            ej.result["totalCredit"] == "120.000000",
        "employee posted journal is balanced");
  check(bankCredit() == "204.000000",
        "employee net credit updates existing bank balance exactly once");
  check(call("post", eid, cmd()).success &&
            count("gl_journal_batches") == batchesBefore + 1,
        "employee posting retry never duplicates journal");
  check(!call("delete", eid, cmd()).success,
        "posted employee voucher immutable");
  emp["requestId"] = "a0000000-0000-4000-8000-000000000012";
  emp["lines"][0]["isWithhold"] = false;
  auto plain = call("create", "", emp);
  check(plain.success && plain.result["netAmount"] == "120.000000" &&
            plain.result["lines"][0]["isImprest"].asBool(),
        "imprest alone does not apply withholding");
  Json::Value edel;
  edel["version"] = plain.result["version"];
  check(call("delete", plain.result["id"].asString(), edel).success,
        "delete employee draft");
  emp["requestId"] = "a0000000-0000-4000-8000-000000000014";
  emp["currencyCode"] = "USD";
  emp["multiCurrency"] = true;
  emp["exchangeRate"] = "12";
  emp["lines"][0]["foreignAmount"] = "10";
  auto efx = call("create", "", emp);
  check(efx.success && efx.result["totalAmount"] == "120.000000" &&
            efx.result["foreignTotal"] == "10.000000",
        "employee foreign currency converts once");
  emp["requestId"] = "a0000000-0000-4000-8000-000000000013";
  sql("INSERT INTO "
      "hr_employee_biodata(id,tenant_id,employee_identifier,first_name,last_"
      "name,date_appointed,date_of_birth) "
      "VALUES('60000000-0000-4000-8000-000000000012',$1,'OTHER','Other','"
      "Employee','2020-01-01','1990-01-01')",
      {other});
  emp["payeeId"] = "60000000-0000-4000-8000-000000000012";
  check(!call("create", "", emp).success,
        "cross-tenant employee reference rejected");
  emp["payeeId"] = supplier;
  check(!call("create", "", emp).success, "supplier ID is not an employee");
  emp["payeeId"] = employee;
  sql("UPDATE hr_employee_biodata SET is_deleted=true WHERE id=$1", {employee});
  check(!call("create", "", emp).success, "deleted employee rejected");
  auto customerCall = [&](std::string op, std::string cid, Json::Value b,
                          AuditIdentity who = {tenant, actor}) {
    return business_desk::domain_services::CustomerService::execute(op, cid, b,
                                                                    who)
        .get();
  };
  Json::Value customerInput;
  customerInput["name"] = "Receipt Customer";
  customerInput["accountNumber"] = "CUS-001";
  customerInput["accountingUnitId"] = unit;
  customerInput["receivableAccountId"] = account;
  customerInput["currencyId"] = currency;
  customerInput["isActive"] = true;
  check(!customerCall("create", "", customerInput, {tenant, actor2}).success,
        "customer catalog writes require administrator");
  auto customerCreated = customerCall("create", "", customerInput);
  if (!customerCreated.success)
    std::cerr << customerCreated.toJson() << std::endl;
  check(customerCreated.success, "create customer through live service");
  const auto customerId = customerCreated.result["id"].asString();
  check(!customerCall("create", "", customerInput).success,
        "customer number unique and reserved");
  auto customerEdit = customerInput;
  customerEdit["version"] = customerCreated.result["version"];
  customerEdit["name"] = "Updated Customer";
  auto customerUpdated = customerCall("update", customerId, customerEdit);
  check(customerUpdated.success &&
            customerUpdated.result["name"] == "Updated Customer",
        "update customer catalog");
  check(!customerCall("update", customerId, customerEdit).success,
        "stale customer version rejected");
  check(customerCall("list", "", {}, {tenant, actor2})
                .result["totalCount"]
                .asInt() == 1,
        "tenant user can load minimal customer catalog");
  check(!customerCall("list", "", {}, {other, actor}).success,
        "cross-tenant catalog actor rejected");
  Json::Value cr = input;
  cr["type"] = "customer-receipt";
  cr["payeeId"] = customerId;
  cr.removeMember("paymentDate");
  cr["receiptDate"] = "2026-10-22";
  cr["requestId"] = "a0000000-0000-4000-8000-000000000021";
  cr["taxes"] = business_desk::voucher_math::defaults();
  cr["retentions"] = Json::arrayValue;
  cr["lines"][0]["isWithhold"] = false;
  cr["lines"][0]["localAmount"] = "80";
  auto receiptLine = cr["lines"][0];
  receiptLine["localAmount"] = "40";
  receiptLine["invoiceNumber"] = "INV-2";
  cr["lines"].append(receiptLine);
  auto cp = call("preview", "", cr);
  check(cp.success && cp.result["proposedJournal"]["lines"].size() == 2,
        "receipt legacy two-line journal preview");
  auto proposal = cp.result["proposedJournal"]["lines"];
  check(proposal[0]["accountId"] == bank &&
            proposal[0]["debit"] == "120.000000" &&
            proposal[1]["accountId"] == account &&
            proposal[1]["credit"] == "120.000000",
        "receipt debits bank and credits AR from all allocations");
  auto tampered = cr;
  tampered["lines"][1]["accountId"] = tax;
  check(!call("preview", "", tampered).success,
        "receipt does not silently ignore different allocation GLs");
  tampered = cr;
  tampered["lines"][0]["isWithhold"] = true;
  check(!call("create", "", tampered).success, "receipt withholding rejected");
  tampered = cr;
  tampered["taxes"]["vat"]["enabled"] = true;
  check(!call("create", "", tampered).success, "receipt taxes rejected");
  tampered = cr;
  tampered["retentions"].append(retention);
  check(!call("create", "", tampered).success, "receipt retentions rejected");
  tampered = cr;
  tampered["receiptDate"] = "2026-02-30";
  check(!call("create", "", tampered).success, "receipt date must be real");
  tampered = cr;
  tampered["lines"][0]["isImprest"] = true;
  check(!call("create", "", tampered).success, "receipt imprest rejected");
  auto createdReceipt = call("create", "", cr);
  if (!createdReceipt.success)
    std::cerr << createdReceipt.toJson() << std::endl;
  check(
      createdReceipt.success &&
          createdReceipt.result["batchNumber"].asString().starts_with("CRV-") &&
          createdReceipt.result["netAmount"] == "120.000000",
      "receipt saves authoritative positive gross and net");
  const auto rid = createdReceipt.result["id"].asString();
  auto rrow = sql("SELECT customer_id::text c,supplier_id::text "
                  "s,employee_id::text e,is_payment p,payment_date::text d "
                  "FROM gl_payment_vouchers WHERE id=$1",
                  {rid})[0]
                  .value;
  check(rrow["c"] == customerId && rrow["e"].isNull() && rrow["s"].isNull() &&
            !rrow["p"].asBool() && rrow["d"] == "2026-10-22",
        "receipt customer link, date and incoming direction persist");
  check(call("create", "", cr).result["id"] == rid,
        "receipt create retry idempotent");
  auto crEdit = cr;
  crEdit.removeMember("requestId");
  crEdit["version"] = createdReceipt.result["version"];
  crEdit["description"] = "Edited receipt";
  auto crUpdated = call("update", rid, crEdit);
  check(crUpdated.success && crUpdated.result["lines"].size() == 2 &&
            crUpdated.result["description"] == "Edited receipt",
        "receipt edit preserves both allocation snapshots");
  check(!call("update", rid, crEdit).success, "stale receipt edit rejected");
  customerEdit["version"] = customerUpdated.result["version"];
  customerEdit["accountNumber"] = "FORBIDDEN-REMAP";
  check(!customerCall("update", customerId, customerEdit).success,
        "live receipt protects customer mapping");
  Json::Value receiptFilter;
  receiptFilter["type"] = "customer-receipt";
  check(call("list", "", receiptFilter).result["items"].size() == 1,
        "receipt register type filter");
  auto rcmd = [&] {
    Json::Value x;
    x["version"] = call("get", rid).result["version"];
    return x;
  };
  check(!call("post", rid, rcmd()).success,
        "receipt cannot post before approval");
  check(call("submit", rid, rcmd()).success, "submit receipt");
  check(!call("approve", rid, rcmd(), {tenant, actor2}).success,
        "receipt approval requires administrator");
  check(call("approve", rid, rcmd()).success, "approve receipt");
  const auto beforeReceipt = count("gl_journal_batches");
  auto bankDebit = [&] {
    return sql("SELECT debit_balance::text d FROM gl_account_balances WHERE "
               "account_id=$1",
               {bank})[0]
        .value["d"];
  };
  const auto debitBefore = bankDebit();
  failAfterJournal = true;
  check(!call("post", rid, rcmd()).success &&
            count("gl_journal_batches") == beforeReceipt &&
            bankDebit() == debitBefore,
        "receipt journal and balance mutation roll back atomically");
  auto receiptPosted = call("post", rid, rcmd());
  check(receiptPosted.success && receiptPosted.result["status"] == "Posted",
        "receipt posts through normal journal ceremony");
  auto rjournal = JournalService::execute(
                      "get", receiptPosted.result["journalId"].asString(), unit,
                      {}, {tenant, actor})
                      .get();
  check(rjournal.success && rjournal.result["status"] == "posted" &&
            rjournal.result["totalDebit"] == "120.000000" &&
            rjournal.result["totalCredit"] == "120.000000",
        "receipt links a balanced posted journal");
  check(bankDebit() == "120.000000" &&
            sql("SELECT credit_balance::text c FROM gl_account_balances WHERE "
                "account_id=$1",
                {account})[0]
                    .value["c"] == "120.000000",
        "receipt bank debit and AR credit update existing balances");
  check(call("post", rid, rcmd()).success &&
            count("gl_journal_batches") == beforeReceipt + 1,
        "receipt posting retry does not duplicate balances");
  check(!call("delete", rid, rcmd()).success &&
            !call("update", rid, crEdit).success,
        "posted receipts immutable");
  check(!call("get", rid, {}, {other, actor}).success,
        "cross-tenant receipt read denied");
  cr["requestId"] = "a0000000-0000-4000-8000-000000000022";
  cr["currencyCode"] = "USD";
  cr["exchangeRate"] = "12";
  cr["multiCurrency"] = true;
  cr["lines"][0]["foreignAmount"] = "6";
  cr["lines"][1]["foreignAmount"] = "4";
  auto receiptFx = call("create", "", cr);
  check(receiptFx.success && receiptFx.result["totalAmount"] == "120.000000" &&
            receiptFx.result["foreignTotal"] == "10.000000" &&
            receiptFx.result["proposedJournal"]["lines"][0]["exchangeRate"] ==
                "1.0000000000",
        "receipt FX converts once into base currency journal");
  Json::Value rdel;
  rdel["version"] = receiptFx.result["version"];
  check(call("delete", receiptFx.result["id"].asString(), rdel).success &&
            !call("get", receiptFx.result["id"].asString()).success,
        "receipt draft and children soft deleted");
  cr["requestId"] = "a0000000-0000-4000-8000-000000000023";
  cr["payeeId"] = supplier;
  check(!call("create", "", cr).success, "supplier cannot be used as customer");
  cr["payeeId"] = customerId;
  sql("UPDATE core_customers SET is_active=false WHERE id=$1", {customerId});
  check(!call("create", "", cr).success,
        "inactive customer rejected server-side");
  sql("UPDATE core_customers SET is_active=true,is_deleted=true WHERE id=$1",
      {customerId});
  check(!call("create", "", cr).success,
        "deleted customer rejected server-side");
  customerInput["accountNumber"] = "CUS-002";
  auto disposableCustomer = customerCall("create", "", customerInput);
  Json::Value deleteCustomer;
  deleteCustomer["version"] = disposableCustomer.result["version"];
  check(disposableCustomer.success &&
            customerCall("delete", disposableCustomer.result["id"].asString(),
                         deleteCustomer)
                .success,
        "archive unreferenced customer through service");
  check(!customerCall("create", "", customerInput).success,
        "archived customer number remains reserved");
  customerInput["accountNumber"] = "CUS-003";
  customerInput["tenantId"] = other;
  check(!customerCall("create", "", customerInput).success,
        "customer tenant scope cannot be client controlled");
  customerInput.removeMember("tenantId");
  customerInput["receivableAccountId"] = "50000000-0000-4000-8000-000000000099";
  check(!customerCall("create", "", customerInput).success,
        "invalid or cross-tenant customer mapping rejected");
  Json::Value invalidPage;
  invalidPage["pageNo"] = 0;
  check(!customerCall("list", "", invalidPage).success,
        "customer pagination bounded");
  Json::Value groupBody;
  groupBody["name"] = "Trade customers";
  check(!customerCall("group-create", "", groupBody, {tenant, actor2}).success,
        "customer group writes require administrator");
  auto cg = customerCall("group-create", "", groupBody);
  check(cg.success && cg.result["createdByUserId"] == actor,
        "customer group create is tenant scoped and audited");
  const auto cgId = cg.result["id"].asString();
  check(!customerCall("group-create", "", groupBody).success,
        "duplicate customer group rejected");
  check(customerCall("group-get", cgId, {}).success &&
            !customerCall("group-get", cgId, {}, {other, actor}).success,
        "customer group detail and tenant isolation");
  groupBody["version"] = cg.result["version"];
  groupBody["name"] = "Trade clients";
  auto cgu = customerCall("group-update", cgId, groupBody);
  check(cgu.success && !customerCall("group-update", cgId, groupBody).success,
        "customer group rename and stale version protection");
  Json::Value full;
  full["accountNumber"] = "CUS-FULL";
  full["name"] = "Full customer";
  full["accountingUnitId"] = unit;
  full["receivableAccountId"] = account;
  full["currencyId"] = currency;
  full["isActive"] = true;
  full["customerGroupId"] = cgId;
  full["status"] = "Legacy live";
  full["statusId"] = "a0000000-0000-4000-8000-000000000088";
  full["vatNumber"] = "VAT-88";
  full["tinNumber"] = "TIN-88";
  full["email"] = "customer@example.test";
  full["phoneNo"] = "+233201234567";
  full["address"] = "Accra";
  full["contactPerson"] = "Ama";
  full["contactPersonPhone"] = "+233241234567";
  full["contactPersonEmail"] = "ama@example.test";
  full["vatAccountId"] = tax;
  full["creditAccountId"] = bank;
  full["irsAccountId"] = tax;
  full["creditLimit"] = "99999999999999.123456";
  auto complete = customerCall("create", "", full);
  if (!complete.success)
    std::cerr << complete.toJson() << std::endl;
  check(complete.success, "create all customer legacy fields");
  for (auto key : full.getMemberNames())
    check(complete.result[key] == full[key],
          "customer editable field round trips exactly");
  check(complete.result["customerGroupName"] == "Trade clients" &&
            complete.result["creditAccountName"] == "Test GL" &&
            complete.result["currencyCode"] == "GHS" &&
            complete.result["balance"] == "0.000000",
        "customer names snapshots and zero balance are server derived");
  const auto fullId = complete.result["id"].asString();
  check(customerCall("get", fullId, {}).result["email"] ==
            "customer@example.test",
        "customer full detail endpoint");
  for (auto key :
       {"balance", "tenantId", "createdByUserId", "customerGroupName",
        "vatAccountName", "currencyCode", "snapshot_currency_name"}) {
    auto badFull = full;
    badFull[key] = "spoof";
    check(!customerCall("create", "", badFull).success,
          "customer audit balance and derived labels cannot be forged");
  }
  check(!complete.result.isMember("buyingRate") &&
            !complete.result.isMember("sellingRate"),
        "customer API omits removed rates");
  for (auto key : {"buyingRate", "sellingRate"}) {
    auto retired = full;
    retired[key] = "1.2345678901";
    check(!customerCall("create", "", retired).success,
          "customer API rejects removed rate fields");
  }
  for (auto key : {"creditLimit"}) {
    auto badFull = full;
    badFull[key] = 1.2;
    check(!customerCall("create", "", badFull).success,
          "customer decimals require strings");
    badFull[key] = "1e4";
    check(!customerCall("create", "", badFull).success,
          "customer decimal exponents rejected");
  }
  auto badFull = full;
  badFull["email"] = "invalid@";
  check(!customerCall("create", "", badFull).success,
        "customer email validated");
  badFull = full;
  badFull["vatAccountId"] = supplier;
  check(!customerCall("create", "", badFull).success,
        "invalid customer optional GL rejected");
  badFull = full;
  badFull["customerGroupId"] = supplier;
  check(!customerCall("create", "", badFull).success,
        "unknown or foreign customer group rejected");
  Json::Value query;
  query["kind"] = "groups";
  query["query"] = "Trade";
  query["pageSize"] = 1;
  check(customerCall("options", "", query).result["data"][0]["id"] == cgId,
        "customer group options search and pagination");
  query["kind"] = "receivables";
  query["query"] = "";
  query["accountingUnitId"] = unit;
  query["pageSize"] = 100;
  check(!customerCall("options", "", query).result["data"].empty(),
        "customer receivable lookup uses live posting unit");
  Json::Value gd;
  gd["version"] = cgu.result["version"];
  check(!customerCall("group-delete", cgId, gd).success,
        "referenced customer group cannot be archived");
  Json::Value partial;
  partial["version"] = complete.result["version"];
  partial["contactPerson"] = "Efua";
  auto partialSaved = customerCall("update", fullId, partial);
  check(partialSaved.success &&
            partialSaved.result["creditLimit"] == full["creditLimit"] &&
            partialSaved.result["contactPerson"] == "Efua",
        "customer omitted extended fields remain unchanged on update");
  Json::Value fd;
  fd["version"] = complete.result["version"];
  check(!customerCall("delete", fullId, fd).success,
        "stale customer delete rejected");
  fd["version"] = partialSaved.result["version"];
  drogon::TestTransaction::failCommit = true;
  check(!customerCall("delete", fullId, fd).success,
        "customer failed commit reported");
  drogon::TestTransaction::failCommit = false;
  check(customerCall("get", fullId, {}).success,
        "failed commit did not archive customer");
  check(customerCall("delete", fullId, fd).success &&
            !customerCall("get", fullId, {}).success,
        "customer versioned soft delete");
  Json::Value wrongGd;
  wrongGd["version"] = 1;
  check(!customerCall("group-delete", cgId, wrongGd).success,
        "stale customer group delete rejected");
  check(customerCall("group-delete", cgId, gd).success,
        "unreferenced customer group soft delete");
  check(!customerCall("group-get", cgId, {}).success,
        "archived customer group hidden");
  query["kind"] = "groups";
  query["query"] = "Trade";
  check(customerCall("options", "", query).result["data"].empty(),
        "archived group not offered in customer lookup");
  check(!customerCall("create", "", full).success,
        "archived group cannot be assigned to customer");
  auto groupsReset =
      sql("SELECT "
          "tenant_reset_snapshot($1,ARRAY['core_customer_groups'])::text s",
          {tenant})[0]
          .value["s"]
          .asString();
  check(groupsReset.find("core_customers") != std::string::npos,
        "customer groups registered with dependent customers for tenant reset");
  std::cout << checks
            << " payment and receipt voucher PostgreSQL checks passed\n";

  PQfinish(db);
}
