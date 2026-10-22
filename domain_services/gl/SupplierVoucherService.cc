#include "SupplierVoucherService.h"
#include "JournalService.h"
#include "VoucherMath.h"
#include "utils/TransactionUtil.h"
#include <chrono>
#include <map>
#include <set>
namespace business_desk::domain_services {
namespace {
using drogon::orm::DbClientPtr;
namespace math = business_desk::voucher_math;
dto::BaseApiResponse fail(const char *code, const std::string &message) {
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
void keys(const Json::Value &b, const std::set<std::string> &allowed) {
  if (!b.isObject())
    throw std::invalid_argument("Expected an object.");
  for (auto k : b.getMemberNames())
    if (!allowed.count(k))
      throw std::invalid_argument("Unexpected or server-owned field: " + k);
}
void text(Json::Value &v, size_t maximum, bool required = false) {
  if (v.isNull() && !required)
    v = "";
  if (!v.isString())
    throw std::invalid_argument("Text fields must be strings.");
  auto s = v.asString();
  auto a = s.find_first_not_of(" \t\r\n"), b = s.find_last_not_of(" \t\r\n");
  s = a == std::string::npos ? "" : s.substr(a, b - a + 1);
  if (s.size() > maximum || s.find('\0') != s.npos || (required && s.empty()))
    throw std::invalid_argument("Missing or oversized text field.");
  v = s;
}
void identifier(Json::Value &v, bool optional = false) {
  if (optional && (v.isNull() || v == "")) {
    v = Json::nullValue;
    return;
  }
  if (!v.isString() || !uuid(v.asString()))
    throw std::invalid_argument("Valid UUID required.");
  auto s = v.asString();
  for (auto &c : s)
    c = std::tolower(static_cast<unsigned char>(c));
  v = s;
}
void date(Json::Value &v) {
  if (!v.isString() ||
      !std::regex_match(v.asString(),
                        std::regex("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")))
    throw std::invalid_argument("Real date required.");
  auto s = v.asString();
  auto y = std::stoi(s.substr(0, 4));
  if (y < 1900 || y > 2999 ||
      !std::chrono::year_month_day{
          std::chrono::year{y},
          std::chrono::month{unsigned(std::stoi(s.substr(5, 2)))},
          std::chrono::day{unsigned(std::stoi(s.substr(8, 2)))}}
           .ok())
    throw std::invalid_argument("Real date required.");
}
Json::Value parse(std::string s) {
  Json::Value v;
  Json::Reader r;
  if (!r.parse(s, v))
    throw std::runtime_error("Invalid stored voucher.");
  return v;
}
std::string json(const Json::Value &v) { return Json::FastWriter().write(v); }
void validate(Json::Value &b, bool create) {
  keys(b, {"accountingUnitId",
           "type",
           "payeeId",
           "entryDate",
           "paymentDate",
           "receiptDate",
           "bankAccountId",
           "bankAccountName",
           "bankGlAccountId",
           "bankGlAccountName",
           "mode",
           "currencyCode",
           "exchangeRate",
           "multiCurrency",
           "chequeNumber",
           "description",
           "lines",
           "retentions",
           "taxes",
           "taxType",
           "periodId",
           "version",
           "requestId"});
  if (b["type"] != "supplier-payment" && b["type"] != "employee-payment" &&
      b["type"] != "customer-receipt")
    throw std::invalid_argument("Unsupported voucher type.");
  const bool employee = b["type"] == "employee-payment";
  const bool receipt = b["type"] == "customer-receipt";
  for (auto k :
       {"accountingUnitId", "payeeId", "bankAccountId", "bankGlAccountId"})
    identifier(b[k]);
  identifier(b["periodId"]);
  if (create)
    identifier(b["requestId"]);
  else if (!b["version"].isInt() || b["version"].asInt() < 1)
    throw std::invalid_argument("Current voucher version required.");
  date(b["entryDate"]);
  date(b[receipt ? "receiptDate" : "paymentDate"]);
  text(b["description"], 200, true);
  text(b["chequeNumber"], 40);
  if (b.isMember("taxType"))
    text(b["taxType"], 40);
  if (!b["multiCurrency"].isBool() || !b["currencyCode"].isString() ||
      !std::regex_match(b["currencyCode"].asString(),
                        std::regex("^[A-Z]{3}$")) ||
      math::parse(b["exchangeRate"], 10) == 0)
    throw std::invalid_argument(
        "Select a currency, mode and positive exchange rate.");
  if (b["mode"] != "Cash" && b["mode"] != "Cheque" &&
      b["mode"] != "Bank transfer" && b["mode"] != "Mobile money")
    throw std::invalid_argument("Invalid payment method.");
  if (b["mode"] == "Cheque" && b["chequeNumber"] == "")
    throw std::invalid_argument("Cheque number required.");
  if (!b["lines"].isArray() || b["lines"].empty() || b["lines"].size() > 200 ||
      !b["retentions"].isArray() || b["retentions"].size() > 100)
    throw std::invalid_argument(
        "Enter 1–200 allocations and at most 100 retentions.");
  if ((employee || receipt) && !b["retentions"].empty())
    throw std::invalid_argument("Employee and receipt vouchers cannot have retentions.");
  for (auto &l : b["lines"]) {
    if (!employee && l.isMember("isImprest"))
      throw std::invalid_argument("Imprest applies only to employee payments.");
    if (employee && !l["isImprest"].isBool())
      throw std::invalid_argument("Imprest flag must be boolean.");
    keys(l,
         {"accountId", "invoiceNumber", "referenceNumber", "description",
          "organizationUnitId", "localAmount", "foreignAmount", "isWithhold",
          "isImprest"});
    identifier(l["accountId"]);
    identifier(l["organizationUnitId"], true);
    text(l["invoiceNumber"], 80);
    text(l["referenceNumber"], 40);
    text(l["description"], 300);
    if (!l["isWithhold"].isBool())
      throw std::invalid_argument("Withholding flag must be boolean.");
    if (receipt && (l["isWithhold"].asBool() || l["accountId"] != b["lines"][0]["accountId"] || l["organizationUnitId"] != b["lines"][0]["organizationUnitId"] || l["accountId"] == b["bankGlAccountId"]))
      throw std::invalid_argument("Receipts have no withholding; all rows must use one customer receivable GL and organizational unit, distinct from the bank GL.");
    math::parse(
        l[b["multiCurrency"].asBool() ? "foreignAmount" : "localAmount"]);
  }
  for (auto &r : b["retentions"]) {
    keys(r, {"accountId", "description", "value", "isPercentage"});
    identifier(r["accountId"]);
    text(r["description"], 160, true);
    if (!r["isPercentage"].isBool())
      throw std::invalid_argument("Retention method must be boolean.");
    math::parse(r["value"]);
  }
  if (!b.isMember("taxes"))
    b["taxes"] = math::defaults();
  if (receipt)
    for (auto k : {"nhil", "getfund", "vat", "cst", "covid", "incomeWithholding", "vatWithholding"})
      if (b["taxes"][k]["enabled"].asBool())
        throw std::invalid_argument("Customer receipts do not support taxes or withholding.");
  math::calculate(b);
  for (auto k : {"incomeWithholding", "vatWithholding"})
    identifier(b["taxes"][k]["accountId"], !b["taxes"][k]["enabled"].asBool());
}
std::string selection() {
  return R"(SELECT (v.source_payload || jsonb_build_object('id',v.id,'version',v.version,'voucherNumber',v.batch_number,'batchNumber',v.batch_number,
 'status',CASE v.status WHEN 'draft' THEN 'Draft' WHEN 'pending_approval' THEN 'Pending approval' WHEN 'approved' THEN 'Approved' WHEN 'posted' THEN 'Posted' ELSE v.status END,
 'createdAt',v.created_at,'updatedAt',COALESCE(v.last_modified_at,v.created_at),'preparer',COALESCE(u.first_name,'')||' '||COALESCE(u.last_name,''),
 'totalAmount',v.calculation->>'gross','netAmount',v.calculation->>'net','retentionsTotal',v.calculation->>'retained','taxSummary',v.calculation,
 'proposedJournal',v.proposed_journal,'journalId',v.journal_batch_id,'periodId',v.posting_period_id))::text AS record
 FROM gl_payment_vouchers v LEFT JOIN users u ON u.id=v.created_by_user_id AND u.tenant_id=v.tenant_id AND u.is_deleted=false
 WHERE v.tenant_id=$1 AND v.is_deleted=false AND v.source_payload IS NOT NULL AND v.voucher_type IN ('supplier-payment','employee-payment','customer-receipt'))";
}
struct Prepared {
  Json::Value source, calc, proposal;
};
drogon::Task<Prepared> prepare(DbClientPtr db, Json::Value b,
                               const std::string &base,
                               const utils::AuditIdentity &who) {
  const std::string unit = b["accountingUnitId"].asString();
  auto period = co_await db->execSqlCoro(
      "SELECT id FROM gl_accounting_periods WHERE tenant_id=$1 AND "
      "accounting_unit_id=$2 AND id=$3 AND is_deleted=false AND $4::date "
      "BETWEEN period_start_date AND period_end_date FOR SHARE",
      who.tenantId, unit, b["periodId"].asString(), b["entryDate"].asString());
  if (period.empty())
    throw std::invalid_argument(
        "Select a live posting period in this unit containing the entry date.");
  const bool receipt = b["type"] == "customer-receipt";
  auto payee = co_await db->execSqlCoro(
      receipt
          ? "SELECT c.name FROM core_customers c JOIN gl_accounts a ON "
            "a.tenant_id=c.tenant_id AND a.id=c.receivable_account_id AND a.is_deleted=false "
            "WHERE c.id=$1 AND c.tenant_id=$2 AND c.is_deleted=false AND c.is_active=true "
            "AND c.accounting_unit_id=$3 AND a.accounting_unit_id=$3 FOR SHARE OF c"
          : b["type"] == "employee-payment"
          ? "SELECT concat_ws(' ',first_name,NULLIF(other_name,''),last_name) AS "
            "name FROM hr_employee_biodata WHERE id=$1 AND tenant_id=$2 AND "
            "is_deleted=false AND $3::uuid IS NOT NULL FOR SHARE"
          : "SELECT s.name FROM core_suppliers s JOIN gl_accounts a ON "
      "a.id=s.credit_account_id AND a.tenant_id=s.tenant_id AND "
      "a.is_deleted=false WHERE s.id=$1 AND s.tenant_id=$2 AND "
      "s.is_deleted=false AND s.status IN('active','on_hold') AND "
      "a.accounting_unit_id=$3 FOR SHARE OF s",
      b["payeeId"].asString(), who.tenantId, unit);
  if (payee.empty())
    throw std::invalid_argument("Select a live payee in this tenant and posting unit.");
  if (receipt) {
    auto mapped = co_await db->execSqlCoro(
        "SELECT id FROM core_customers WHERE tenant_id=$1 AND id=$2 AND "
        "receivable_account_id=$3 AND is_deleted=false AND is_active=true FOR SHARE",
        who.tenantId, b["payeeId"].asString(), b["lines"][0]["accountId"].asString());
    if (mapped.empty())
      throw std::invalid_argument("Receipt allocations must use the customer's receivable GL.");
  }
  auto currency = co_await db->execSqlCoro(
      "SELECT id FROM core_currencies WHERE code=$1 AND is_deleted=false AND "
      "is_active=true FOR SHARE",
      b["currencyCode"].asString());
  auto baseRow = co_await db->execSqlCoro(
      "SELECT code FROM core_currencies WHERE id=$1 AND is_deleted=false AND "
      "is_active=true FOR SHARE",
      base);
  if (currency.empty() || baseRow.empty())
    throw std::invalid_argument("Select an active currency.");
  bool foreign = currency[0]["id"].as<std::string>() != base;
  if (foreign != b["multiCurrency"].asBool() ||
      (!foreign && math::parse(b["exchangeRate"], 10) != 10000000000LL))
    throw std::invalid_argument("Base-currency vouchers use rate one; foreign "
                                "currencies require multi-currency mode.");
  auto bank = co_await db->execSqlCoro(
      "SELECT id,bank_name,account_number FROM gl_bank_accounts WHERE "
      "tenant_id=$1 AND accounting_unit_id=$2 AND id=$3 AND account_id=$4 AND "
      "is_deleted=false AND is_active=true FOR SHARE",
      who.tenantId, unit, b["bankAccountId"].asString(),
      b["bankGlAccountId"].asString());
  if (bank.empty())
    throw std::invalid_argument(
        "Choose a live bank account linked to the selected GL.");
  auto calc = math::calculate(b);
  Json::Value journal;
  journal["accountingUnitId"] = unit;
  journal["batchDate"] = b["entryDate"];
  journal["description"] = b["description"];
  journal["periodId"] = b["periodId"];
  journal["isMultiCurrency"] = false;
  journal["lines"] = Json::arrayValue;
  const Json::Value firstOU = b["lines"][0]["organizationUnitId"];
  auto line = [&](Json::Value account, std::string amount, bool credit,
                  Json::Value ou, std::string desc, std::string reference) {
    if (math::parse(amount) == 0)
      return;
    Json::Value l;
    l["accountId"] = account;
    l["currencyId"] = base;
    l["exchangeRate"] = "1.0000000000";
    l["organizationUnitId"] = ou;
    l["description"] = desc;
    l["referenceNumber"] = reference;
    l["chequeNumber"] = b["chequeNumber"];
    l["transactionDate"] = b["entryDate"];
    l["debit"] = credit ? "0.000000" : amount;
    l["credit"] = credit ? amount : "0.000000";
    journal["lines"].append(l);
  };
  for (Json::ArrayIndex i = 0; i < b["lines"].size(); i++) {
    auto &l = b["lines"][i];
    l["localAmount"] = calc["lines"][i]["gross"];
    if (!foreign)
      l["foreignAmount"] = "0.000000";
    if (!receipt) line(l["accountId"], l["localAmount"].asString(), false,
         l["organizationUnitId"], l["description"].asString(),
         l["referenceNumber"].asString());
  }
  if (receipt) {
    line(b["bankGlAccountId"], calc["gross"].asString(), false, firstOU,
         "Customer receipt to bank / cash", b["lines"][0]["referenceNumber"].asString());
    line(b["lines"][0]["accountId"], calc["gross"].asString(), true, firstOU,
         "Customer receivable settlement", b["lines"][0]["referenceNumber"].asString());
  } else {
  line(b["bankGlAccountId"], calc["net"].asString(), true, firstOU,
       b["type"] == "employee-payment" ? "Net employee payment" : "Net supplier payment", b["lines"][0]["referenceNumber"].asString());
  for (auto k : {"incomeWithholding", "vatWithholding"})
    if (math::parse(calc[k]) > 0)
      line(b["taxes"][k]["accountId"], calc[k].asString(), true, firstOU,
           std::string(k) + " · " + b["taxes"][k]["rate"].asString() + "%",
           b["lines"][0]["referenceNumber"].asString());
  for (Json::ArrayIndex i = 0; i < b["retentions"].size(); i++)
    line(b["retentions"][i]["accountId"], calc["retentions"][i].asString(),
         true, firstOU, b["retentions"][i]["description"].asString(),
         b["lines"][0]["referenceNumber"].asString());
  }
  if (journal["lines"].size() < 2)
    throw std::invalid_argument(
        "Proposed journal must have at least two positive lines.");
  // Every GL is validated against the same catalog constraints used by
  // JournalService.
  auto a = co_await db->execSqlCoro(
      "SELECT id,account_number,account_name FROM gl_accounts WHERE "
      "tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false AND "
      "status='active' AND allow_manual_posting=true AND "
      "is_control_account=false AND COALESCE(currency_id,$3::uuid)=$3::uuid "
      "AND id IN(SELECT (x->>'accountId')::uuid FROM "
      "jsonb_array_elements($4::jsonb) x) ORDER BY id FOR UPDATE",
      who.tenantId, unit, base, json(journal["lines"]));
  std::map<std::string, Json::Value> names;
  for (auto &r : a) {
    Json::Value n;
    n["name"] = r["account_name"].as<std::string>();
    n["number"] = r["account_number"].as<std::string>();
    names[r["id"].as<std::string>()] = n;
  }
  for (auto &l : journal["lines"])
    if (!names.count(l["accountId"].asString()))
      throw std::invalid_argument(
          "Posting accounts must be live, manual-postable, non-control and "
          "denominated in the unit base currency. Foreign voucher amounts are "
          "converted once before posting.");
  auto centers = co_await db->execSqlCoro(
      "SELECT id,name FROM core_cost_centers WHERE tenant_id=$1 AND "
      "is_deleted=false AND id IN(SELECT (x->>'organizationUnitId')::uuid FROM "
      "jsonb_array_elements($2::jsonb) x) ORDER BY id FOR UPDATE",
      who.tenantId, json(journal["lines"]));
  std::map<std::string, std::string> centerNames;
  for (auto &c : centers)
    centerNames[c["id"].as<std::string>()] = c["name"].as<std::string>();
  for (auto &l : b["lines"]) {
    auto account = names[l["accountId"].asString()];
    l["accountName"] = account["name"];
    l["accountNumber"] = account["number"];
    if (!l["organizationUnitId"].isNull() &&
        !centerNames.count(l["organizationUnitId"].asString()))
      throw std::invalid_argument(
          "Organization must be a live tenant cost center.");
    l["organizationUnitName"] =
        l["organizationUnitId"].isNull()
            ? ""
            : centerNames[l["organizationUnitId"].asString()];
  }
  for (Json::ArrayIndex i = 0; i < b["retentions"].size(); i++) {
    auto &r = b["retentions"][i];
    r["accountName"] = names[r["accountId"].asString()]["name"];
    r["accountNumber"] = names[r["accountId"].asString()]["number"];
    r["amount"] = calc["retentions"][i];
  }
  b["bankGlAccountName"] =
      names[b["bankGlAccountId"].asString()]["number"].asString() + " — " +
      names[b["bankGlAccountId"].asString()]["name"].asString();
  b["bankAccountName"] = bank[0]["bank_name"].as<std::string>() + " · " +
                         bank[0]["account_number"].as<std::string>();
  b["payeeName"] = payee[0]["name"].as<std::string>();
  b["baseCurrencyCode"] = baseRow[0]["code"].as<std::string>();
  b["foreignTotal"] = "0.000000";
  if (foreign) {
    math::I n = 0;
    for (auto &l : b["lines"])
      n += math::parse(l["foreignAmount"]);
    b["foreignTotal"] = math::text(n);
  }
  b.removeMember("version");
  Prepared result{b, calc, journal};
  co_return result;
}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db, std::string op,
                                       std::string id, Json::Value b,
                                       utils::AuditIdentity who) {
  co_await db->execSqlCoro("SET LOCAL lock_timeout='5s'");
  co_await db->execSqlCoro("SET LOCAL statement_timeout='60s'");
  auto actor = co_await db->execSqlCoro(
      "SELECT u.is_tenant_admin_user FROM tenants t JOIN users u ON "
      "u.tenant_id=t.id WHERE t.id=$1 AND t.is_deleted=false AND "
      "t.is_active=true AND u.id=$2 AND u.is_deleted=false AND "
      "u.is_active=true AND u.is_locked_out=false AND "
      "u.is_host_admin_user=false FOR SHARE OF t,u",
      who.tenantId, who.userId);
  if (actor.empty())
    co_return fail("forbidden", "Live tenant user required.");
  dto::BaseApiResponse result;
  if (op == "list") {
    std::string search = b.get("search", "").asString(),
                status = b.get("status", "").asString(),
                type = b.get("type", "").asString();
    if (search.size() > 200)
      co_return fail("validation_error", "Search must be at most 200 bytes.");
    for (auto &c : status)
      c = c == ' ' ? '_' : std::tolower(static_cast<unsigned char>(c));
    auto rows = co_await db->execSqlCoro(
        selection() +
            " AND ($2='' OR strpos(lower(v.batch_number||' "
            "'||COALESCE(v.source_payload->>'payeeName','')||' "
            "'||COALESCE(v.source_payload->>'description','')),lower($2))>0) "
            "AND ($3='' OR v.status=$3) AND ($4='' OR v.voucher_type=$4) ORDER "
            "BY v.created_at DESC,v.id LIMIT 1001",
        who.tenantId, search, status, type);
    if (rows.size() > 1000)
      co_return fail("validation_error", "More than 1000 matching vouchers. "
                                         "Narrow the search or status filter.");
    result.result["items"] = Json::arrayValue;
    for (auto &r : rows)
      result.result["items"].append(parse(r["record"].as<std::string>()));
    result.result["total"] = result.result["items"].size();
    result.success = true;
    co_return result;
  }
  Json::Value current;
  std::string unit;
  if (op != "create" && op != "preview") {
    auto scope = co_await db->execSqlCoro(
        "SELECT accounting_unit_id FROM gl_payment_vouchers WHERE tenant_id=$1 "
        "AND id=$2 AND is_deleted=false AND source_payload IS NOT NULL",
        who.tenantId, id);
    if (scope.empty())
      co_return fail("not_found", "Payment voucher not found.");
    unit = scope[0]["accounting_unit_id"].as<std::string>();
  } else
    unit = b["accountingUnitId"].asString();
  auto units = co_await db->execSqlCoro(
      "SELECT base_currency_id FROM core_accounting_units WHERE tenant_id=$1 "
      "AND id=$2 AND is_deleted=false AND is_active=true FOR UPDATE",
      who.tenantId, unit);
  if (units.empty())
    co_return fail("not_found", "Active accounting unit not found.");
  const std::string base = units[0]["base_currency_id"].as<std::string>();
  if (op != "create" && op != "preview") {
    auto rows = co_await db->execSqlCoro(
        selection() + " AND v.id=$2 FOR UPDATE OF v", who.tenantId, id);
    if (rows.empty())
      co_return fail("not_found", "Payment voucher not found.");
    current = parse(rows[0]["record"].as<std::string>());
    if (op == "update" && b["type"] != current["type"])
      co_return fail("validation_error", "Voucher type cannot be changed.");
    if (op == "get") {
      result.success = true;
      result.result = current;
      co_return result;
    }
    if (op == "post" && current["status"] == "Posted") {
      result.success = true;
      result.result = current;
      co_return result;
    }
    if (!b["version"].isInt() || b["version"] != current["version"])
      co_return fail("conflict", "Voucher changed. Refresh before continuing.");
    if (current["status"] == "Posted")
      co_return fail("conflict", "Posted vouchers are immutable.");
  }
  if (op == "delete") {
    if (current["status"] != "Draft")
      co_return fail("conflict", "Only drafts can be deleted.");
    co_await db->execSqlCoro(
        "UPDATE gl_payment_vouchers SET "
        "is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,last_modified_"
        "at=now(),last_modified_by_user_id=$3,version=version+1 WHERE "
        "tenant_id=$1 AND id=$2 AND is_deleted=false",
        who.tenantId, id, who.userId);
    for (auto table :
         {"gl_payment_voucher_lines", "gl_payment_voucher_retentions"})
      co_await db->execSqlCoro(
          "UPDATE " + std::string(table) +
              " SET "
              "is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,last_"
              "modified_at=now(),last_modified_by_user_id=$3 WHERE "
              "tenant_id=$1 AND payment_voucher_id=$2 AND is_deleted=false",
          who.tenantId, id, who.userId);
    result.success = true;
    result.result["id"] = id;
    result.result["deleted"] = true;
    co_return result;
  }
  if (op == "submit" || op == "approve") {
    if ((op == "submit" && current["status"] != "Draft") ||
        (op == "approve" && current["status"] != "Pending approval"))
      co_return fail("conflict", "Invalid voucher workflow transition.");
    if (op == "approve" && !actor[0]["is_tenant_admin_user"].as<bool>())
      co_return fail("forbidden",
                     "A tenant administrator must approve vouchers.");
    const std::string next = op == "submit" ? "pending_approval" : "approved";
    co_await db->execSqlCoro(
        "UPDATE gl_payment_vouchers SET "
        "status=$3,version=version+1,last_modified_at=now(),last_modified_by_"
        "user_id=$4 WHERE tenant_id=$1 AND id=$2 AND is_deleted=false",
        who.tenantId, id, next, who.userId);
  } else if (op == "post") {
    if (current["status"] != "Approved")
      co_return fail("conflict", "Approve the voucher before posting.");
    auto source = co_await db->execSqlCoro(
        "SELECT source_payload::text FROM gl_payment_vouchers WHERE "
        "tenant_id=$1 AND id=$2 AND is_deleted=false",
        who.tenantId, id);
    auto fresh = parse(source[0]["source_payload"].as<std::string>());
    // Saved projections have derived fields; rebuild the writable source before
    // revalidation.
    for (auto k : {"payeeName", "baseCurrencyCode", "foreignTotal"})
      fresh.removeMember(k);
    for (auto &l : fresh["lines"])
      for (auto k : {"accountName", "accountNumber", "organizationUnitName"})
        l.removeMember(k);
    for (auto &r : fresh["retentions"])
      for (auto k : {"accountName", "accountNumber", "amount"})
        r.removeMember(k);
    fresh["version"] = current["version"];
    validate(fresh, false);
    auto prepared = co_await prepare(db, fresh, base, who);
    auto posted =
        co_await JournalService::createAndPost(db, prepared.proposal, who);
    if (!posted.success)
      co_return posted;
    co_await db->execSqlCoro(
        "UPDATE gl_payment_vouchers SET "
        "status='posted',is_posted=true,journal_batch_id=$3,version=version+1,"
        "last_modified_at=now(),last_modified_by_user_id=$4 WHERE tenant_id=$1 "
        "AND id=$2 AND is_deleted=false AND status='approved'",
        who.tenantId, id, posted.result["id"].asString(), who.userId);
  } else {
    if (op == "update" &&
        (current["status"] != "Draft" ||
         b["accountingUnitId"] != current["accountingUnitId"]))
      co_return fail("conflict",
                     "Only drafts can be updated without changing scope.");
    if (op == "create") {
      auto duplicate = co_await db->execSqlCoro(
          selection() + " AND v.accounting_unit_id=$2 AND v.idempotency_key=$3",
          who.tenantId, unit, b["requestId"].asString());
      if (!duplicate.empty()) {
        auto same = co_await db->execSqlCoro(
            "SELECT id FROM gl_payment_vouchers WHERE tenant_id=$1 AND "
            "accounting_unit_id=$2 AND idempotency_key=$3 AND "
            "request_hash=md5($4::jsonb::text) AND created_by_user_id=$5 AND "
            "is_deleted=false",
            who.tenantId, unit, b["requestId"].asString(), json(b), who.userId);
        if (same.empty())
          co_return fail(
              "conflict",
              "Request ID already belongs to another payload or actor.");
        result.success = true;
        result.result = parse(duplicate[0]["record"].as<std::string>());
        co_return result;
      }
    }
    const std::string signature = json(b);
    auto prepared = co_await prepare(db, b, base, who);
    if (op == "preview") {
      result.success = true;
      result.result["taxSummary"] = prepared.calc;
      result.result["proposedJournal"] = prepared.proposal;
      co_return result;
    }
    const std::string payload = json(prepared.source),
                      calculation = json(prepared.calc),
                      proposal = json(prepared.proposal);
    if (op == "create") {
      auto seq = co_await db->execSqlCoro(
          "INSERT INTO "
          "gl_supplier_voucher_sequences(tenant_id,accounting_unit_id,next_"
          "number,created_by_user_id) VALUES($1,$2,2,$3) ON "
          "CONFLICT(tenant_id,accounting_unit_id) DO UPDATE SET "
          "next_number=gl_supplier_voucher_sequences.next_number+1 RETURNING "
          "next_number-1 AS number",
          who.tenantId, unit, who.userId);
      const std::string number = std::string(b["type"] == "customer-receipt" ? "CRV-" : b["type"] == "employee-payment" ? "EPV-" : "SPV-") + seq[0]["number"].as<std::string>();
      auto saved = co_await db->execSqlCoro(
          R"(INSERT INTO gl_payment_vouchers(tenant_id,accounting_unit_id,batch_number,voucher_entry_date,payment_date,mode_of_payment,voucher_type,currency_id,buy_rate,supplier_id,supplier_name,bank_account_id,gross_amount,net_amount,total_withheld,total_vat_withheld,total_retained,base_amount,total_vat_amount,source_payload,calculation,proposed_journal,posting_period_id,idempotency_key,request_hash,created_by_user_id)
 VALUES($1,$2,$3,($4::jsonb->>'entryDate')::date,COALESCE($4::jsonb->>'receiptDate',$4::jsonb->>'paymentDate')::date,$4::jsonb->>'mode',$4::jsonb->>'type',(SELECT id FROM core_currencies WHERE code=$4::jsonb->>'currencyCode' AND is_deleted=false AND is_active=true),($4::jsonb->>'exchangeRate')::numeric,CASE WHEN $4::jsonb->>'type'='supplier-payment' THEN ($4::jsonb->>'payeeId')::uuid END,CASE WHEN $4::jsonb->>'type'='supplier-payment' THEN $4::jsonb->>'payeeName' END,($4::jsonb->>'bankAccountId')::uuid,($5::jsonb->>'gross')::numeric,($5::jsonb->>'net')::numeric,($5::jsonb->>'incomeWithholding')::numeric,($5::jsonb->>'vatWithholding')::numeric,($5::jsonb->>'retained')::numeric,($5::jsonb->>'base')::numeric,($5::jsonb->>'vat')::numeric,$4::jsonb,$5::jsonb,$6::jsonb,($4::jsonb->>'periodId')::uuid,$4::jsonb->>'requestId',md5($7::jsonb::text),$8) RETURNING id)",
          who.tenantId, unit, number, payload, calculation, proposal, signature,
          who.userId);
      id = saved[0]["id"].as<std::string>();
    } else {
      co_await db->execSqlCoro(
          R"(UPDATE gl_payment_vouchers SET voucher_entry_date=($3::jsonb->>'entryDate')::date,payment_date=COALESCE($3::jsonb->>'receiptDate',$3::jsonb->>'paymentDate')::date,mode_of_payment=$3::jsonb->>'mode',currency_id=(SELECT id FROM core_currencies WHERE code=$3::jsonb->>'currencyCode' AND is_deleted=false AND is_active=true),buy_rate=($3::jsonb->>'exchangeRate')::numeric,supplier_id=CASE WHEN $3::jsonb->>'type'='supplier-payment' THEN ($3::jsonb->>'payeeId')::uuid END,supplier_name=CASE WHEN $3::jsonb->>'type'='supplier-payment' THEN $3::jsonb->>'payeeName' END,bank_account_id=($3::jsonb->>'bankAccountId')::uuid,gross_amount=($4::jsonb->>'gross')::numeric,net_amount=($4::jsonb->>'net')::numeric,total_withheld=($4::jsonb->>'incomeWithholding')::numeric,total_vat_withheld=($4::jsonb->>'vatWithholding')::numeric,total_retained=($4::jsonb->>'retained')::numeric,base_amount=($4::jsonb->>'base')::numeric,total_vat_amount=($4::jsonb->>'vat')::numeric,source_payload=$3::jsonb,calculation=$4::jsonb,proposed_journal=$5::jsonb,posting_period_id=($3::jsonb->>'periodId')::uuid,version=version+1,last_modified_at=now(),last_modified_by_user_id=$6 WHERE tenant_id=$1 AND id=$2 AND is_deleted=false)",
          who.tenantId, id, payload, calculation, proposal, who.userId);
      for (auto table :
           {"gl_payment_voucher_lines", "gl_payment_voucher_retentions"})
        co_await db->execSqlCoro(
            "UPDATE " + std::string(table) +
                " SET "
                "is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,last_"
                "modified_at=now(),last_modified_by_user_id=$3 WHERE "
                "tenant_id=$1 AND payment_voucher_id=$2 AND is_deleted=false",
            who.tenantId, id, who.userId);
    }
    co_await db->execSqlCoro(
        R"(UPDATE gl_payment_vouchers SET customer_id=CASE WHEN $3::jsonb->>'type'='customer-receipt' THEN ($3::jsonb->>'payeeId')::uuid END,customer_name=CASE WHEN $3::jsonb->>'type'='customer-receipt' THEN $3::jsonb->>'payeeName' END,is_payment=($3::jsonb->>'type'<>'customer-receipt'),tax_type=$3::jsonb->>'taxType',employee_id=CASE WHEN $3::jsonb->>'type'='employee-payment' THEN ($3::jsonb->>'payeeId')::uuid END,
 employee_name=CASE WHEN $3::jsonb->>'type'='employee-payment' THEN left($3::jsonb->>'payeeName',200) END,batch_description=$3::jsonb->>'description',bank_account_name=left($3::jsonb->>'bankAccountName',200),cheque_number=$3::jsonb->>'chequeNumber',currency_code=$3::jsonb->>'currencyCode',
 is_multi_currency=($3::jsonb->>'multiCurrency')::boolean,
 has_communication_service_tax=($3::jsonb->'taxes'->'cst'->>'enabled')::boolean,communication_service_tax_rate=($3::jsonb->'taxes'->'cst'->>'rate')::numeric,
 has_covid_tax=($3::jsonb->'taxes'->'covid'->>'enabled')::boolean,covid_tax_rate=($3::jsonb->'taxes'->'covid'->>'rate')::numeric,
 has_withholding=($3::jsonb->'taxes'->'incomeWithholding'->>'enabled')::boolean,withholding_rate=($3::jsonb->'taxes'->'incomeWithholding'->>'rate')::numeric,withholding_account_id=($3::jsonb->'taxes'->'incomeWithholding'->>'accountId')::uuid,
 has_vat_withhold=($3::jsonb->'taxes'->'vatWithholding'->>'enabled')::boolean,withholding_vat_percentage=($3::jsonb->'taxes'->'vatWithholding'->>'rate')::numeric,vat_withholding_account_id=($3::jsonb->'taxes'->'vatWithholding'->>'accountId')::uuid,
 has_getfund_levy=($3::jsonb->'taxes'->'getfund'->>'enabled')::boolean,getfund_levy_rate=($3::jsonb->'taxes'->'getfund'->>'rate')::numeric,
 has_national_health_insurance_levy=($3::jsonb->'taxes'->'nhil'->>'enabled')::boolean,national_health_insurance_levy_rate=($3::jsonb->'taxes'->'nhil'->>'rate')::numeric,
 has_vat=($3::jsonb->'taxes'->'vat'->>'enabled')::boolean,vat_rate=($3::jsonb->'taxes'->'vat'->>'rate')::numeric,vat_withhold_amount=($4::jsonb->>'vatWithholding')::numeric
 WHERE tenant_id=$1 AND id=$2 AND is_deleted=false)",
        who.tenantId, id, payload, calculation);
    for (auto &l : prepared.source["lines"])
      co_await db->execSqlCoro(
          R"(INSERT INTO gl_payment_voucher_lines(tenant_id,accounting_unit_id,payment_voucher_id,debit_account_id,debit_account_name,withhold,organization_unit_id,organization_unit_name,amount,foreign_debit_amount,reference_number,cheque_number,description,invoice_number,has_imprest,created_by_user_id)
 VALUES($1,$2,$3,($4::jsonb->>'accountId')::uuid,$4::jsonb->>'accountName',($4::jsonb->>'isWithhold')::boolean,($4::jsonb->>'organizationUnitId')::uuid,$4::jsonb->>'organizationUnitName',($4::jsonb->>'localAmount')::numeric,COALESCE(NULLIF($4::jsonb->>'foreignAmount',''),'0')::numeric,$4::jsonb->>'referenceNumber',$5,$4::jsonb->>'description',$4::jsonb->>'invoiceNumber',COALESCE(($4::jsonb->>'isImprest')::boolean,false),$6))",
          who.tenantId, unit, id, json(l), b["chequeNumber"].asString(),
          who.userId);
    for (auto &r : prepared.source["retentions"])
      co_await db->execSqlCoro(
          R"(INSERT INTO gl_payment_voucher_retentions(tenant_id,accounting_unit_id,payment_voucher_id,description,credit_account_id,credit_account_name,is_percentage,amount,total_amount,created_by_user_id) VALUES($1,$2,$3,$4::jsonb->>'description',($4::jsonb->>'accountId')::uuid,$4::jsonb->>'accountName',($4::jsonb->>'isPercentage')::boolean,($4::jsonb->>'value')::numeric,($4::jsonb->>'amount')::numeric,$5))",
          who.tenantId, unit, id, json(r), who.userId);
  }
  auto saved =
      co_await db->execSqlCoro(selection() + " AND v.id=$2", who.tenantId, id);
  result.success = true;
  result.result = parse(saved[0]["record"].as<std::string>());
  co_return result;
}
} // namespace
drogon::Task<dto::BaseApiResponse>
SupplierVoucherService::execute(std::string op, std::string id,
                                Json::Value body, utils::AuditIdentity who) {
  if (!uuid(who.tenantId) || !uuid(who.userId))
    co_return fail("unauthorized", "Tenant authentication required.");
  if (op != "list" && op != "get" && op != "create" && op != "update" &&
      op != "preview" && op != "delete" && op != "submit" && op != "approve" &&
      op != "post")
    co_return fail("validation_error",
                   "Unsupported payment voucher operation.");
  try {
    if (op != "list" && op != "create" && op != "preview" && !uuid(id))
      throw std::invalid_argument("Valid voucher ID required.");
    if (op == "create" || op == "update" || op == "preview")
      validate(body, op != "update");
    else if (op != "get" && op != "list") {
      keys(body, {"version"});
      if (!body["version"].isInt() || body["version"].asInt() < 1)
        throw std::invalid_argument("Current voucher version required.");
    }
    auto db = drogon::app().getDbClient();
    auto ready = co_await db->execSqlCoro(
        "SELECT EXISTS(SELECT 1 FROM pg_attribute WHERE "
        "attrelid=to_regclass('gl_payment_vouchers') AND "
        "attname='proposed_journal' AND NOT attisdropped) AND "
        "to_regclass('gl_supplier_voucher_sequences') IS NOT NULL AS ready");
    if (!ready[0]["ready"].as<bool>())
      co_return fail("schema_not_ready",
                     "Apply migration 017_supplier_voucher_posting.sql.");
    if (body["type"] == "employee-payment") {
      auto employees = co_await db->execSqlCoro(
          "SELECT to_regclass('hr_employee_biodata') IS NOT NULL AS ready");
      if (!employees[0]["ready"].as<bool>())
        co_return fail("schema_not_ready", "Apply migration 019_employee_biodata.sql.");
    }
    if (body["type"] == "customer-receipt") {
      auto customers = co_await db->execSqlCoro("SELECT to_regclass('core_customers') IS NOT NULL AS ready");
      if (!customers[0]["ready"].as<bool>())
        co_return fail("schema_not_ready", "Apply migration 020_customer_receipts.sql.");
    }
    auto tx = co_await db->newTransactionCoro();
    dto::BaseApiResponse result;
    try {
      result = co_await run(tx, op, id, body, who);
    } catch (...) {
      tx->rollback();
      throw;
    }
    if (!result.success) {
      tx->rollback();
      co_return result;
    }
    if (!(co_await utils::CommitTransaction{std::move(tx)}))
      co_return fail("database_error", "Unable to commit payment voucher.");
    co_return result;
  } catch (const std::invalid_argument &e) {
    co_return fail("validation_error", e.what());
  } catch (const drogon::orm::UniqueViolation &) {
    co_return fail("conflict",
                   "Voucher request, journal link or number already exists.");
  } catch (const std::exception &) {
    co_return fail("database_error", "Payment voucher service unavailable.");
  }
}
} // namespace business_desk::domain_services
