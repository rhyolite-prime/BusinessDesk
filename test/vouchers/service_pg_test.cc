// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport
// seam.
#include "domain_services/gl/JournalService.h"
#include "domain_services/gl/SupplierVoucherService.h"
#include "domain_services/gl/VoucherMath.h"

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
      "email,vat_number,currency_id,buying_rate,selling_rate,credit_limit,irs_"
      "account_id,is_resident,tax_office,created_by_user_id) "
      "VALUES($1,$2,'SUP1',$3,'active',$4,$4,$4,'','Supplier','','','','','',''"
      ",'',$5,1,1,0,$4,true,'',$6)",
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
  bad["type"] = "customer-receipt";
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
  std::cout << checks << " supplier voucher PostgreSQL checks passed\n";
  PQfinish(db);
}
