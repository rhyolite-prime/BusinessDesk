#include "FinancialReportService.h"
#include "utils/TransactionUtil.h"
#include <regex>
#include <chrono>
#include <map>
#include <set>
namespace business_desk::domain_services {
namespace {
dto::BaseApiResponse fail(const char* code,const char* message){dto::BaseApiResponse r;r.error["code"]=code;r.error["message"]=message;return r;}
bool uuid(const std::string& value){return std::regex_match(value,std::regex("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$"));}
bool date(const std::string& value){if(!std::regex_match(value,std::regex("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")))return false;auto y=std::stoi(value.substr(0,4)),m=std::stoi(value.substr(5,2)),d=std::stoi(value.substr(8,2));return y>=1900&&y<=2999&&std::chrono::year_month_day{std::chrono::year{y},std::chrono::month{unsigned(m)},std::chrono::day{unsigned(d)}}.ok();}
const std::map<std::string,int> categories{{"current_asset",0},{"noncurrent_asset",0},{"current_liability",1},{"noncurrent_liability",1},{"equity",2},{"revenue",3},{"other_income",3},{"cost_of_sales",4},{"operating_expense",4},{"depreciation",4},{"finance_cost",4},{"income_tax",4}};
}
drogon::Task<dto::BaseApiResponse> FinancialReportService::execute(std::string unit,std::string through,Json::Value mappings,utils::AuditIdentity who,bool write){
 if(!uuid(who.tenantId)||!uuid(who.userId))co_return fail("unauthorized","Tenant authentication required.");
 if(!uuid(unit)||!date(through))co_return fail("validation_error","Select an accounting unit and valid through date.");
 try {
 auto db=drogon::app().getDbClient();
 auto users=co_await db->execSqlCoro("SELECT is_tenant_admin_user FROM users WHERE id=$1 AND tenant_id=$2 AND is_deleted=false AND is_active=true AND is_locked_out=false",who.userId,who.tenantId);
 if(users.empty())co_return fail("forbidden","Active tenant user required.");
 auto units=co_await db->execSqlCoro("SELECT id FROM core_accounting_units WHERE tenant_id=$1 AND id=$2 AND is_deleted=false AND is_active=true",who.tenantId,unit);
 if(units.empty())co_return fail("not_found","Active accounting unit not found.");
 if(write){
  if(!users[0]["is_tenant_admin_user"].as<bool>())co_return fail("forbidden","Tenant administrator required to change report mappings.");
  if(!mappings.isArray()||mappings.empty()||mappings.size()>500)co_return fail("validation_error","Supply 1–500 account mappings.");
  std::set<std::string> seen;
  for(const auto& item:mappings)if(!item.isObject()||item.size()!=2||!item["accountId"].isString()||!uuid(item["accountId"].asString())||!seen.insert(item["accountId"].asString()).second||!item["category"].isString()||(!item["category"].asString().empty()&&!categories.count(item["category"].asString())))co_return fail("validation_error","Invalid, duplicate or unknown report mapping.");
  auto tx=co_await db->newTransactionCoro();
  try {
   auto lockedUnits=co_await tx->execSqlCoro("SELECT id FROM core_accounting_units WHERE tenant_id=$1 AND id=$2 AND is_deleted=false AND is_active=true FOR UPDATE",who.tenantId,unit);
   if(lockedUnits.empty()){tx->rollback();co_return fail("not_found","Active accounting unit not found.");}
   auto admins=co_await tx->execSqlCoro("SELECT id FROM users WHERE id=$1 AND tenant_id=$2 AND is_deleted=false AND is_active=true AND is_locked_out=false AND is_tenant_admin_user=true FOR SHARE",who.userId,who.tenantId);
   if(admins.empty()){tx->rollback();co_return fail("forbidden","Tenant administrator required.");}
   for(const auto& item:mappings){
    const auto account=item["accountId"].asString(),category=item["category"].asString();
    auto accounts=co_await tx->execSqlCoro("SELECT standard_account_type FROM gl_accounts WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$3 AND is_deleted=false FOR SHARE",who.tenantId,unit,account);
    if(accounts.empty()||(!category.empty()&&accounts[0]["standard_account_type"].as<int>()!=categories.at(category))){tx->rollback();co_return fail("validation_error","Mapping must match a live account in this unit and its account type.");}
    if(category.empty())co_await tx->execSqlCoro("UPDATE gl_report_account_mappings SET is_deleted=true,last_modified_at=now(),last_modified_by_user_id=$4 WHERE tenant_id=$1 AND accounting_unit_id=$2 AND account_id=$3",who.tenantId,unit,account,who.userId);
    else co_await tx->execSqlCoro("INSERT INTO gl_report_account_mappings(tenant_id,accounting_unit_id,account_id,category,created_by_user_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(tenant_id,accounting_unit_id,account_id) DO UPDATE SET category=EXCLUDED.category,is_deleted=false,last_modified_at=now(),last_modified_by_user_id=$5",who.tenantId,unit,account,category,who.userId);
   }
   co_await tx->execSqlCoro("INSERT INTO gl_report_mapping_events(tenant_id,accounting_unit_id,created_by_user_id,changes) VALUES($1,$2,$3,$4::jsonb)",who.tenantId,unit,who.userId,Json::FastWriter().write(mappings));
  }catch(...){tx->rollback();throw;}
  if(!(co_await utils::CommitTransaction{std::move(tx)}))co_return fail("database_error","Unable to commit report mappings.");
  dto::BaseApiResponse r;r.success=true;r.result["saved"]=true;co_return r;
 }
 // One PostgreSQL statement provides a single MVCC snapshot for all report inputs.
 auto rows=co_await db->execSqlCoro(R"SQL(SELECT jsonb_build_object(
 'unitName',u.name,'currencyCode',c.code,'through',$3::text,'generatedAt',now(),
 'companyName',COALESCE(p.company_name,''),'decimals',COALESCE(p.display_decimals,2),'fiscalMonth',COALESCE(p.first_month_of_fiscal_year,1),
 'accounts',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'number',a.account_number,'name',a.account_name,'type',a.standard_account_type,'category',COALESCE(m.category,'')) ORDER BY a.account_number,a.id)
 FROM gl_accounts a LEFT JOIN gl_report_account_mappings m ON m.tenant_id=a.tenant_id AND m.accounting_unit_id=a.accounting_unit_id AND m.account_id=a.id AND m.is_deleted=false
 WHERE a.tenant_id=$1 AND a.accounting_unit_id=$2 AND a.is_deleted=false),'[]'::jsonb),
 'lines',COALESCE((SELECT jsonb_agg(x.record ORDER BY x.day,x.batch,x.position,x.id) FROM (
 SELECT l.id,l.transaction_date AS day,b.batch_number AS batch,l.line_number AS position,jsonb_build_object(
 'id',l.id,'accountId',l.account_id,'accountName',l.account_name,'type',l.standard_account_type,'batchId',b.id,'batchNumber',b.batch_number,'date',l.transaction_date,'batchDate',b.batch_date,'description',l.description,'reference',l.reference_number,'source',b.transaction_source,
 'costCenterId',l.organization_unit_id,'costCenter',l.organization_unit_name,'currency',l.currency_code,'rate',l.buy_rate::text,
 'debit',l.base_debit_amount::text,'credit',l.base_credit_amount::text,'transactionDebit',l.debit_amount::text,'transactionCredit',l.credit_amount::text,'opening',b.is_opening_balance OR l.is_opening_balance) AS record
 FROM gl_journal_lines l JOIN gl_journal_batches b ON b.id=l.journal_batch_id AND b.tenant_id=l.tenant_id AND b.accounting_unit_id=l.accounting_unit_id
 WHERE l.tenant_id=$1 AND l.accounting_unit_id=$2 AND l.is_deleted=false AND b.is_deleted=false AND b.status='posted' AND l.transaction_date<=$3::date
 ORDER BY l.transaction_date,b.batch_number,l.line_number,l.id LIMIT 50001) x),'[]'::jsonb),
 'budgets',COALESCE((SELECT jsonb_agg(jsonb_build_object('accountId',b.account_id,'costCenterId',b.organization_unit_id,'month',d.month,'year',d.year,'original',d.budget_amount::text,'revised',d.revised_amount::text))
 FROM gl_budgets b JOIN gl_budget_details d ON d.budget_id=b.id AND d.tenant_id=b.tenant_id AND d.accounting_unit_id=b.accounting_unit_id
 WHERE b.tenant_id=$1 AND b.accounting_unit_id=$2 AND b.is_deleted=false AND d.is_deleted=false AND b.status IN ('approved','closed') AND make_date(d.year,d.month,1)<=$3::date),'[]'::jsonb))::text AS snapshot
 FROM core_accounting_units u JOIN core_currencies c ON c.id=u.base_currency_id AND c.is_deleted=false
 LEFT JOIN core_company_profiles p ON p.tenant_id=u.tenant_id AND p.is_deleted=false
 WHERE u.tenant_id=$1 AND u.id=$2 AND u.is_deleted=false AND u.is_active=true)SQL",who.tenantId,unit,through);
 if(rows.empty())co_return fail("not_found","Unit or base currency unavailable.");
 Json::Value snapshot;Json::Reader reader;if(!reader.parse(rows[0]["snapshot"].as<std::string>(),snapshot))throw std::runtime_error("Invalid snapshot");
 if(snapshot["lines"].size()>50000)co_return fail("validation_error","Report exceeds 50,000 posted lines through this date. Use an earlier through date or contact an administrator for a server-aggregated extract.");
 dto::BaseApiResponse result;result.success=true;result.result=snapshot;result.result["canManageMappings"]=users[0]["is_tenant_admin_user"].as<bool>();co_return result;
 }catch(const std::exception&){co_return fail("database_error","Financial report service unavailable. Verify migration 027 and ledger prerequisites.");}
}
}
