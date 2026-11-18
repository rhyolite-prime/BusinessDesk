#include "LedgerDashboardService.h"
#include <chrono>
#include <cctype>
#include <regex>
#include <set>

namespace business_desk::domain_services {
namespace {
dto::BaseApiResponse fail(const char *code, const char *message) {
  dto::BaseApiResponse result;
  result.error["code"] = code;
  result.error["message"] = message;
  return result;
}

bool uuid(const std::string &value) {
  static const std::regex pattern(
      "^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");
  return std::regex_match(value, pattern) &&
         value != "00000000-0000-0000-0000-000000000000";
}

bool date(const std::string &value) {
  static const std::regex pattern("^[0-9]{4}-[0-9]{2}-[0-9]{2}$");
  if (!std::regex_match(value, pattern)) return false;
  const int year = std::stoi(value.substr(0, 4));
  const auto month = static_cast<unsigned>(std::stoi(value.substr(5, 2)));
  const auto day = static_cast<unsigned>(std::stoi(value.substr(8, 2)));
  return year >= 1900 && year <= 2999 &&
         std::chrono::year_month_day{std::chrono::year{year},
                                     std::chrono::month{month},
                                     std::chrono::day{day}}.ok();
}

bool normalize(Json::Value &filters) {
  if (!filters.isObject()) return false;
  const std::set<std::string> allowed = {
      "accountingUnitId", "dateFrom", "dateTo", "costCenterId",
      "includeChildCostCenters", "source", "currencyId", "status"};
  for (const auto &key : filters.getMemberNames())
    if (!allowed.count(key)) return false;
  for (const auto &key : {"accountingUnitId", "dateFrom", "dateTo"})
    if (!filters[key].isString()) return false;
  if (!uuid(filters["accountingUnitId"].asString()) ||
      !date(filters["dateFrom"].asString()) ||
      !date(filters["dateTo"].asString()) ||
      filters["dateFrom"].asString() > filters["dateTo"].asString()) return false;
  for (const auto &key : {"costCenterId", "currencyId", "source", "status"}) {
    if (!filters.isMember(key)) filters[key] = "";
    if (!filters[key].isString()) return false;
  }
  for (const auto &key : {"accountingUnitId", "costCenterId", "currencyId"}) {
    auto value = filters[key].asString();
    if (key != std::string("accountingUnitId") && value.empty()) continue;
    if (key == std::string("costCenterId") && value == "unassigned") continue;
    if (!uuid(value)) return false;
    for (auto &c : value)
      c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
    filters[key] = value;
  }
  if (!filters.isMember("includeChildCostCenters"))
    filters["includeChildCostCenters"] = true;
  if (!filters["includeChildCostCenters"].isBool()) return false;
  const auto source = filters["source"].asString();
  if (source.size() > 40) return false;
  for (unsigned char c : source) if (std::iscntrl(c)) return false;
  const std::set<std::string> statuses = {
      "", "draft", "pending_approval", "approved", "posted", "rejected",
      "voided", "reversed"};
  return statuses.count(filters["status"].asString());
}

// Catalogs contain only live tenant units/centers and real transaction dimensions.
const char *optionsSql = R"SQL(
SELECT jsonb_build_object(
  'accountingUnits', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'code',u.code,
      'baseCurrency',c.code,'fiscalYearStartMonth',u.fiscal_year_start_month)
      ORDER BY lower(u.name),u.id)
    FROM core_accounting_units u JOIN core_currencies c ON c.id=u.base_currency_id
    WHERE u.tenant_id=$1 AND u.is_deleted=false AND u.is_active=true AND c.is_deleted=false
  ),'[]'::jsonb),
  'costCenters', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'parentId',c.parent_id)
      ORDER BY lower(c.name),c.id)
    FROM core_cost_centers c WHERE c.tenant_id=$1 AND c.is_deleted=false
  ),'[]'::jsonb),
  'currencies', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'code',c.code) ORDER BY c.code,c.id)
    FROM core_currencies c WHERE c.is_deleted=false AND (
      EXISTS(SELECT 1 FROM core_accounting_units u WHERE u.tenant_id=$1 AND u.is_deleted=false
        AND u.is_active=true AND u.base_currency_id=c.id)
      OR EXISTS(SELECT 1 FROM gl_journal_lines l JOIN gl_journal_batches b
        ON b.id=l.journal_batch_id AND b.tenant_id=l.tenant_id AND b.accounting_unit_id=l.accounting_unit_id
        JOIN core_accounting_units u ON u.id=b.accounting_unit_id AND u.tenant_id=b.tenant_id
        WHERE l.tenant_id=$1 AND l.is_deleted=false AND b.is_deleted=false
          AND u.is_deleted=false AND u.is_active=true AND l.currency_id=c.id))
  ),'[]'::jsonb),
  'sources', COALESCE((
    SELECT jsonb_agg(s.source ORDER BY s.source) FROM (
      SELECT DISTINCT b.transaction_source AS source FROM gl_journal_batches b
      JOIN core_accounting_units u ON u.id=b.accounting_unit_id AND u.tenant_id=b.tenant_id
      WHERE b.tenant_id=$1 AND b.is_deleted=false AND u.is_deleted=false AND u.is_active=true
    ) s
  ),'[]'::jsonb)
)::text AS snapshot
)SQL";

// Aggregate inside PostgreSQL, not from a paged register or the latest N entries.
// All dashboard sections use the same MVCC snapshot and the same dimensional scope.
const char *dashboardSql = R"SQL(
WITH RECURSIVE p AS (
  SELECT ($3::jsonb->>'dateFrom')::date AS date_from, ($3::jsonb->>'dateTo')::date AS date_to,
    $3::jsonb->>'costCenterId' AS center_filter,
    NULLIF(NULLIF($3::jsonb->>'costCenterId','unassigned'),'')::uuid AS center_id,
    ($3::jsonb->>'includeChildCostCenters')::boolean AS include_children,
    NULLIF($3::jsonb->>'currencyId','')::uuid AS currency_id,
    $3::jsonb->>'source' AS source, $3::jsonb->>'status' AS status
), center_scope AS (
  SELECT c.id FROM core_cost_centers c CROSS JOIN p
  WHERE c.tenant_id=$1 AND c.is_deleted=false AND c.id=p.center_id
  UNION
  SELECT c.id FROM core_cost_centers c JOIN center_scope parent ON c.parent_id=parent.id CROSS JOIN p
  WHERE c.tenant_id=$1 AND c.is_deleted=false AND p.include_children
), scoped_lines AS MATERIALIZED (
  SELECT l.tenant_id,l.accounting_unit_id,l.journal_batch_id,l.account_id,l.currency_id,
    l.transaction_date,l.debit_amount,l.credit_amount,l.base_debit_amount,l.base_credit_amount,l.is_opening_balance,
    b.status AS batch_status,b.is_opening_balance AS batch_opening,
    COALESCE(a.standard_account_type,l.standard_account_type) AS account_type,
    COALESCE(a.standard_account_type,l.standard_account_type)<>l.standard_account_type AS reclassified
  FROM gl_journal_lines l JOIN gl_journal_batches b
    ON b.id=l.journal_batch_id AND b.tenant_id=l.tenant_id AND b.accounting_unit_id=l.accounting_unit_id
  LEFT JOIN gl_accounts a ON a.id=l.account_id AND a.tenant_id=l.tenant_id
    AND a.accounting_unit_id=l.accounting_unit_id AND a.is_deleted=false
  CROSS JOIN p
  WHERE l.tenant_id=$1 AND l.accounting_unit_id=$2 AND l.is_deleted=false AND b.is_deleted=false
    AND l.transaction_date<=p.date_to AND (p.source='' OR b.transaction_source=p.source)
    AND (p.currency_id IS NULL OR l.currency_id=p.currency_id)
    AND (p.center_filter='' OR (p.center_filter='unassigned' AND l.organization_unit_id IS NULL)
      OR l.organization_unit_id IN(SELECT id FROM center_scope))
), totals AS (
  SELECT
    round(COALESCE(sum(base_debit_amount-base_credit_amount) FILTER(WHERE account_type=0),0),6)::text AS assets,
    round(COALESCE(sum(base_credit_amount-base_debit_amount) FILTER(WHERE account_type=1),0),6)::text AS liabilities,
    round(COALESCE(sum(base_credit_amount-base_debit_amount) FILTER(WHERE account_type=3
      AND transaction_date>=p.date_from AND NOT is_opening_balance AND NOT batch_opening),0),6)::text AS revenue,
    round(COALESCE(sum(base_debit_amount-base_credit_amount) FILTER(WHERE account_type=4
      AND transaction_date>=p.date_from AND NOT is_opening_balance AND NOT batch_opening),0),6)::text AS expenditure,
    count(*) AS posted_lines,
    count(*) FILTER(WHERE account_type NOT BETWEEN 0 AND 4) AS unclassified_lines,
    count(*) FILTER(WHERE reclassified) AS reclassified_lines
  FROM scoped_lines CROSS JOIN p WHERE batch_status='posted'
), period_lines AS (
  SELECT journal_batch_id, sum(base_debit_amount) AS debit, sum(base_credit_amount) AS credit, count(*) AS line_count
  FROM scoped_lines CROSS JOIN p WHERE transaction_date>=p.date_from GROUP BY journal_batch_id
), activity AS (
  SELECT b.id,b.status,b.batch_date,b.created_at,
    jsonb_build_object('id',b.id,'batchNumber',b.batch_number,'description',b.batch_description,
      'date',b.batch_date,'source',b.transaction_source,
      'debit',round(COALESCE(l.debit,0),6)::text,'credit',round(COALESCE(l.credit,0),6)::text,
      'lineCount',COALESCE(l.line_count,0),
      'status',CASE b.status WHEN 'draft' THEN 'Draft' WHEN 'pending_approval' THEN 'Pending approval'
        WHEN 'approved' THEN 'Approved' WHEN 'posted' THEN 'Posted' WHEN 'rejected' THEN 'Rejected'
        WHEN 'voided' THEN 'Voided' WHEN 'reversed' THEN 'Reversed' END,
      'preparer',COALESCE(NULLIF(btrim(concat_ws(' ',actor.first_name,actor.last_name)),''),actor.username,'')) AS record
  FROM gl_journal_batches b CROSS JOIN p
  LEFT JOIN period_lines l ON l.journal_batch_id=b.id
  LEFT JOIN users actor ON actor.id=b.created_by_user_id AND actor.tenant_id=b.tenant_id AND actor.is_deleted=false
  WHERE b.tenant_id=$1 AND b.accounting_unit_id=$2 AND b.is_deleted=false
    AND (p.source='' OR b.transaction_source=p.source) AND (p.status='' OR b.status=p.status)
    AND (l.journal_batch_id IS NOT NULL OR (
      p.center_filter='' AND p.currency_id IS NULL AND b.batch_date BETWEEN p.date_from AND p.date_to
      AND NOT EXISTS(SELECT 1 FROM gl_journal_lines any_line WHERE any_line.journal_batch_id=b.id
        AND any_line.tenant_id=b.tenant_id AND any_line.accounting_unit_id=b.accounting_unit_id AND any_line.is_deleted=false)))
), statuses(code,label,position) AS (
  VALUES ('posted','Posted',1),('pending_approval','Pending approval',2),('approved','Approved',3),
    ('draft','Draft',4),('rejected','Rejected',5),('voided','Voided',6),('reversed','Reversed',7)
)
SELECT jsonb_build_object(
  'accountingUnit',jsonb_build_object('id',u.id,'name',u.name,'code',u.code,'baseCurrency',c.code),
  'asOf',now(),'filters',$3::jsonb,
  'metrics',jsonb_build_array(
    jsonb_build_object('key','assets','label','Total assets','amount',t.assets,'currency',c.code,'note','Posted balance through '||p.date_to),
    jsonb_build_object('key','liabilities','label','Total liabilities','amount',t.liabilities,'currency',c.code,'note','Posted balance through '||p.date_to),
    jsonb_build_object('key','revenue','label','Revenue','amount',t.revenue,'currency',c.code,'note','Posted activity in selected period'),
    jsonb_build_object('key','expenditure','label','Expenditure','amount',t.expenditure,'currency',c.code,'note','Posted activity in selected period')),
  'cashPosition',COALESCE((
    SELECT jsonb_agg(jsonb_build_object('label',cash.code||' bank / cash','currency',cash.code,'amount',cash.amount) ORDER BY cash.code)
    FROM (SELECT currency.code,round(sum(l.debit_amount-l.credit_amount),6)::text AS amount
      FROM scoped_lines l JOIN core_currencies currency ON currency.id=l.currency_id
      WHERE l.batch_status='posted' AND EXISTS(SELECT 1 FROM gl_bank_accounts bank
        WHERE bank.tenant_id=l.tenant_id AND bank.accounting_unit_id=l.accounting_unit_id
          AND bank.account_id=l.account_id AND bank.is_deleted=false)
      GROUP BY currency.id,currency.code) cash
  ),'[]'::jsonb),
  'postedLineCount',t.posted_lines,'unclassifiedLineCount',t.unclassified_lines,'reclassifiedLineCount',t.reclassified_lines,
  'journalCount',(SELECT count(*) FROM activity),
  'pendingApprovalCount',(SELECT count(*) FROM activity WHERE status='pending_approval'),
  'journalStatuses',(SELECT jsonb_agg(jsonb_build_object('status',s.code,'label',s.label,
    'count',(SELECT count(*) FROM activity a WHERE a.status=s.code)) ORDER BY s.position) FROM statuses s),
  'recentJournals',COALESCE((SELECT jsonb_agg(r.record ORDER BY r.batch_date DESC,r.created_at DESC,r.id DESC)
    FROM (SELECT * FROM activity ORDER BY batch_date DESC,created_at DESC,id DESC LIMIT 10) r),'[]'::jsonb),
  'pendingJournals',COALESCE((SELECT jsonb_agg(r.record ORDER BY r.batch_date,r.created_at,r.id)
    FROM (SELECT * FROM activity WHERE status='pending_approval' ORDER BY batch_date,created_at,id LIMIT 5) r),'[]'::jsonb)
)::text AS snapshot
FROM core_accounting_units u JOIN core_currencies c ON c.id=u.base_currency_id
CROSS JOIN p CROSS JOIN totals t
WHERE u.tenant_id=$1 AND u.id=$2 AND u.is_deleted=false AND u.is_active=true AND c.is_deleted=false
)SQL";
}

drogon::Task<dto::BaseApiResponse> LedgerDashboardService::execute(
    std::string operation, Json::Value filters, utils::AuditIdentity who) {
  if (!uuid(who.tenantId) || !uuid(who.userId))
    co_return fail("unauthorized", "Tenant authentication required.");
  if ((operation != "options" && operation != "dashboard") ||
      (operation == "options" && (!filters.isObject() || !filters.empty())) ||
      (operation == "dashboard" && !normalize(filters)))
    co_return fail("validation_error", "Select a valid accounting unit, date range and dashboard filters.");
  try {
    auto db = drogon::app().getDbClient();
    auto users = co_await db->execSqlCoro(
        "SELECT id FROM users WHERE id=$1 AND tenant_id=$2 AND is_deleted=false "
        "AND is_active=true AND is_locked_out=false", who.userId, who.tenantId);
    if (users.empty()) co_return fail("forbidden", "Active tenant user required.");
    std::string snapshot;
    if (operation == "options") {
      auto rows = co_await db->execSqlCoro(optionsSql, who.tenantId);
      snapshot = rows[0]["snapshot"].as<std::string>();
    } else {
      const auto center = filters["costCenterId"].asString();
      if (!center.empty() && center != "unassigned") {
        auto centers = co_await db->execSqlCoro(
            "SELECT id FROM core_cost_centers WHERE tenant_id=$1 AND id=$2 AND is_deleted=false",
            who.tenantId, center);
        if (centers.empty()) co_return fail("not_found", "Cost center not found in this tenant.");
      }
      const auto currency = filters["currencyId"].asString();
      if (!currency.empty()) {
        auto currencies = co_await db->execSqlCoro(
            "SELECT id FROM core_currencies WHERE id=$1 AND is_deleted=false", currency);
        if (currencies.empty()) co_return fail("not_found", "Transaction currency not found.");
      }
      const std::string unit = filters["accountingUnitId"].asString();
      const std::string payload = Json::FastWriter().write(filters);
      auto rows = co_await db->execSqlCoro(dashboardSql, who.tenantId, unit, payload);
      if (rows.empty()) co_return fail("not_found", "Active accounting unit or base currency not found.");
      snapshot = rows[0]["snapshot"].as<std::string>();
    }
    dto::BaseApiResponse result;
    Json::Reader reader;
    if (!reader.parse(snapshot, result.result))
      throw std::runtime_error("Invalid dashboard snapshot");
    result.success = true;
    co_return result;
  } catch (const std::exception &) {
    co_return fail("database_error", "Ledger dashboard unavailable. Verify ledger prerequisites.");
  }
}
}
