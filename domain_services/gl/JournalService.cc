#include "JournalService.h"
#include "utils/TransactionUtil.h"
#include <regex>
#include <chrono>
#include <set>
#include <map>
#include <limits>
namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
dto::BaseApiResponse fail(const char* code,const std::string& message){dto::BaseApiResponse r;r.error["code"]=code;r.error["message"]=message;return r;}
bool uuid(const std::string& s){static const std::regex p("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");return std::regex_match(s,p)&&s!="00000000-0000-0000-0000-000000000000";}
std::string lower(std::string s){for(auto& c:s)c=static_cast<char>(std::tolower(static_cast<unsigned char>(c)));return s;}
bool optionalId(Json::Value& v){if(v.isNull())return true;if(!v.isString())return false;auto s=v.asString();if(s.empty()||s=="00000000-0000-0000-0000-000000000000")v=Json::nullValue;else if(!uuid(s))return false;else v=lower(s);return true;}
bool date(const Json::Value& v){if(!v.isString()||!std::regex_match(v.asString(),std::regex("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")))return false;const auto s=v.asString();int y=std::stoi(s.substr(0,4)),m=std::stoi(s.substr(5,2)),d=std::stoi(s.substr(8,2));return y>=1900&&y<=2999&&std::chrono::year_month_day{std::chrono::year{y},std::chrono::month{unsigned(m)},std::chrono::day{unsigned(d)}}.ok();}
bool text(Json::Value& v,size_t limit,bool required=false){if(v.isNull()&&!required){v="";return true;}if(!v.isString())return false;auto s=v.asString();auto a=s.find_first_not_of(" \t\r\n"),z=s.find_last_not_of(" \t\r\n");s=a==std::string::npos?"":s.substr(a,z-a+1);if(s.size()>limit||s.find('\0')!=std::string::npos||(required&&s.empty()))return false;v=s;return true;}
bool decimal(const Json::Value& v,bool rate=false){static const std::regex money("^(0|[1-9][0-9]{0,13})(\\.[0-9]{1,6})?$"),fx("^(0|[1-9][0-9]{0,9})(\\.[0-9]{1,10})?$");return v.isString()&&std::regex_match(v.asString(),rate?fx:money);}
bool zero(const std::string& s){return s.find_first_not_of("0.")==std::string::npos;}
bool one(const std::string& s){return s=="1"||(s.starts_with("1.")&&s.find_first_not_of('0',2)==std::string::npos);}
Json::Value decode(const Row& row){Json::Value v;Json::Reader r;if(!r.parse(row["record"].as<std::string>(),v))throw std::runtime_error("Invalid journal projection");return v;}
std::string projection(){return R"(jsonb_build_object('id',b.id,'accountingUnitId',b.accounting_unit_id,'batchNumber',b.batch_number,'batchDate',b.batch_date,'description',b.batch_description,
'periodId',b.period_id,'version',b.version,'status',b.status,'totalDebit',b.total_debit::text,'totalCredit',b.total_credit::text,
'isMultiCurrency',EXISTS(SELECT 1 FROM gl_journal_lines l WHERE l.tenant_id=b.tenant_id AND l.accounting_unit_id=b.accounting_unit_id AND l.journal_batch_id=b.id AND l.is_deleted=false AND l.is_multi_currency=true),
'lines',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'accountId',l.account_id,'accountName',l.account_name,
'accountNumber',COALESCE((SELECT account_number FROM gl_accounts a WHERE a.id=l.account_id AND a.tenant_id=l.tenant_id AND a.accounting_unit_id=l.accounting_unit_id AND a.is_deleted=false),''),
'costCenterId',l.cost_center_id,'organizationUnitId',l.organization_unit_id,'organizationUnitName',l.organization_unit_name,
'referenceNumber',COALESCE(l.reference_number,''),'chequeNumber',COALESCE(l.cheque_number,''),'description',COALESCE(l.description,''),'transactionDate',l.transaction_date,
'currencyId',l.currency_id,'currencyCode',l.currency_code,'currencyName',l.currency_name,'exchangeRate',l.buy_rate::text,
'debit',l.debit_amount::text,'credit',l.credit_amount::text,'baseDebit',l.base_debit_amount::text,'baseCredit',l.base_credit_amount::text)
ORDER BY l.line_number NULLS LAST,l.created_at,l.id) FROM gl_journal_lines l WHERE l.tenant_id=b.tenant_id AND l.accounting_unit_id=b.accounting_unit_id AND l.journal_batch_id=b.id AND l.is_deleted=false),'[]'::jsonb)) AS record)";}
std::string selection(){return "SELECT "+projection()+" FROM gl_journal_batches b WHERE b.tenant_id=$1 AND b.accounting_unit_id=$2 AND b.is_deleted=false AND b.transaction_source='general_journal'";}
// Catalog check is safe even before migration. Never auto-migrate with an API role.
drogon::Task<bool> ready(DbClientPtr db){auto r=co_await db->execSqlCoro(R"(SELECT
 EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('gl_journal_batches') AND attname='version' AND NOT attisdropped)
 AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('gl_journal_lines') AND attname='line_number' AND NOT attisdropped)
 AND EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('uq_gl_journal_lines_live_position') AND indisvalid AND indisready)
 AND EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('uq_gl_journal_batches_idempotency') AND NOT indnullsnotdistinct AND indisvalid) AND to_regclass('core_cost_centers') IS NOT NULL AS ready)");co_return !r.empty()&&r[0]["ready"].as<bool>();}
struct Normalized {Json::Value body;std::string error;};
drogon::Task<Normalized> normalize(DbClientPtr db,Json::Value body,const Json::Value& current,const std::string& base,const std::string& unit,const utils::AuditIdentity& who,bool write){
 Normalized n;auto invalid=[&](std::string error){Normalized x;x.error=error;return x;};
 if(!date(body["batchDate"])||!text(body["description"],200,true)||!body["isMultiCurrency"].isBool()||!optionalId(body["periodId"]))co_return invalid("Enter a real batch date (1900–2999), description (1–200 bytes), journal mode and valid optional period UUID.");
 if(!body["lines"].isArray()||body["lines"].size()<2||body["lines"].size()>500)co_return invalid("Enter between 2 and 500 journal lines.");
 std::map<std::string,Json::Value> prior;for(auto& l:current["lines"])prior[l["id"].asString()]=l;std::set<std::string> seen;
 for(auto& l:body["lines"]){
  if(!l.isObject())co_return invalid("Each journal line must be an object.");
  for(auto& k:l.getMemberNames())if(k!="id"&&k!="accountId"&&k!="currencyId"&&k!="costCenterId"&&k!="exchangeRate"&&k!="debit"&&k!="credit"&&k!="description"&&k!="referenceNumber"&&k!="chequeNumber"&&k!="transactionDate")co_return invalid("Unexpected journal line field; names, base amounts and organization assignments are server-owned.");
  if(l.isMember("id")){if(!l["id"].isString()||!uuid(l["id"].asString()))co_return invalid("Invalid line ID.");l["id"]=lower(l["id"].asString());auto id=l["id"].asString();if(!prior.count(id)||!seen.insert(id).second)co_return invalid("Line IDs must be unique live lines of this draft.");}
  for(auto k:{"accountId","currencyId"}){if(!l[k].isString()||!uuid(l[k].asString()))co_return invalid("Select a live GL and currency for every line.");l[k]=lower(l[k].asString());}
  if(!l.isMember("transactionDate"))l["transactionDate"]=body["batchDate"];
  if(!optionalId(l["costCenterId"])||!date(l["transactionDate"])||!text(l["description"],300)||!text(l["referenceNumber"],40)||!text(l["chequeNumber"],40))co_return invalid("Invalid line date, cost center or text length (description 300; reference/cheque 40).");
  if(!decimal(l["debit"])||!decimal(l["credit"])||!decimal(l["exchangeRate"],true)||zero(l["exchangeRate"].asString())||zero(l["debit"].asString())==zero(l["credit"].asString()))co_return invalid("Each line needs exactly one positive side, decimal-string amounts (14+6 digits) and a positive rate (10+10 digits).");
 }
 const std::string payload=Json::FastWriter().write(body["lines"]),lock=write?" FOR UPDATE":"";
 auto accounts=co_await db->execSqlCoro("SELECT id,account_name,COALESCE(currency_id,$4::uuid) AS currency_id,standard_account_type FROM gl_accounts WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false AND status='active' AND allow_manual_posting=true AND is_control_account=false AND id IN(SELECT (x->>'accountId')::uuid FROM jsonb_array_elements($3::jsonb) x) ORDER BY id"+lock,who.tenantId,unit,payload,base);
 auto currencies=co_await db->execSqlCoro("SELECT id,code,name FROM core_currencies WHERE is_deleted=false AND is_active=true AND (id=$1 OR id IN(SELECT (x->>'currencyId')::uuid FROM jsonb_array_elements($2::jsonb) x)) ORDER BY id"+lock,base,payload);
 auto centers=co_await db->execSqlCoro("SELECT id FROM core_cost_centers WHERE tenant_id=$1 AND is_deleted=false AND id IN(SELECT (x->>'costCenterId')::uuid FROM jsonb_array_elements($2::jsonb) x) ORDER BY id"+lock,who.tenantId,payload);
 std::map<std::string,Json::Value> accountMap,currencyMap;std::set<std::string> centerIds;
 for(auto& r:accounts){Json::Value a;a["name"]=r["account_name"].as<std::string>();a["currency"]=r["currency_id"].as<std::string>();a["type"]=r["standard_account_type"].as<int>();accountMap[r["id"].as<std::string>()]=a;}
 for(auto& r:currencies){Json::Value c;c["code"]=r["code"].as<std::string>();c["name"]=r["name"].as<std::string>();currencyMap[r["id"].as<std::string>()]=c;}
 for(auto& r:centers)centerIds.insert(r["id"].as<std::string>());
 if(!currencyMap.count(base))co_return invalid("The unit's base currency must be live and active.");
 int position=0;for(auto& l:body["lines"]){const auto a=l["accountId"].asString(),c=l["currencyId"].asString();
  if(!accountMap.count(a)||!currencyMap.count(c)||accountMap[a]["currency"]!=c)co_return invalid("GL must be active, manual-postable, non-control, in this unit and match the selected active currency.");
  if(!l["costCenterId"].isNull()&&!centerIds.count(l["costCenterId"].asString()))co_return invalid("Cost center must be live in this tenant.");
  if((!body["isMultiCurrency"].asBool()&&c!=body["lines"][0]["currencyId"].asString())||(c==base&&!one(l["exchangeRate"].asString())))co_return invalid("Single-currency journals must use one currency throughout; base-currency rates must equal 1.");
  l["accountName"]=accountMap[a]["name"];l["standardAccountType"]=accountMap[a]["type"];l["currencyCode"]=currencyMap[c]["code"];l["currencyName"]=currencyMap[c]["name"];l["lineNumber"]=++position;
  l["organizationUnitId"]=Json::nullValue;l["organizationUnitName"]="";
  if(l.isMember("id")){l["organizationUnitId"]=prior[l["id"].asString()]["organizationUnitId"];l["organizationUnitName"]=prior[l["id"].asString()]["organizationUnitName"];}
 }
 const std::string normalized=Json::FastWriter().write(body["lines"]);
 auto math=co_await db->execSqlCoro(R"(WITH lines AS(SELECT x,round((x->>'debit')::numeric*(x->>'exchangeRate')::numeric,6) d,round((x->>'credit')::numeric*(x->>'exchangeRate')::numeric,6) c FROM jsonb_array_elements($1::jsonb) x)
 SELECT sum(d)::text AS debit,sum(c)::text AS credit,sum(d)=sum(c) AS balanced,
 bool_and(d<=99999999999999.999999 AND c<=99999999999999.999999 AND d+c>0) AND sum(d)<=99999999999999.999999 AND sum(c)<=99999999999999.999999 AS fits,
 jsonb_agg(x||jsonb_build_object('baseDebit',d::text,'baseCredit',c::text) ORDER BY (x->>'lineNumber')::int)::text AS lines FROM lines)",normalized);
 if(!math[0]["fits"].as<bool>())co_return invalid("Converted amounts/totals overflow numeric(20,6), or a positive amount rounds to zero.");
 Json::Reader reader;if(!reader.parse(math[0]["lines"].as<std::string>(),body["lines"]))throw std::runtime_error("Invalid normalized lines");
 body["totalDebit"]=math[0]["debit"].as<std::string>();body["totalCredit"]=math[0]["credit"].as<std::string>();body["balanced"]=math[0]["balanced"].as<bool>();n.body=body;co_return n;
}
Json::Value editable(const Json::Value& current){Json::Value b;b["batchDate"]=current["batchDate"];b["description"]=current["description"];b["periodId"]=current["periodId"];b["isMultiCurrency"]=current["isMultiCurrency"];b["lines"]=Json::arrayValue;for(const auto& l:current["lines"]){Json::Value x;for(auto k:{"id","accountId","currencyId","costCenterId","exchangeRate","debit","credit","description","referenceNumber","chequeNumber","transactionDate"})x[k]=l[k];b["lines"].append(x);}return b;}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db,const std::string& op,const std::string& id,const std::string& unit,Json::Value input,const utils::AuditIdentity& who){
 const bool write=op=="create"||op=="update"||op=="delete"||op=="post";
 const std::string unitSql="SELECT id,base_currency_id FROM core_accounting_units WHERE tenant_id=$1 AND id=$2 AND is_deleted=false AND is_active=true"+std::string(write?" FOR UPDATE":"");
 auto units=co_await db->execSqlCoro(unitSql,who.tenantId,unit);if(units.empty())co_return fail("not_found","Active accounting unit not found.");const std::string base=units[0]["base_currency_id"].as<std::string>();
 dto::BaseApiResponse result;
 if(op=="options"){
  auto accounts=co_await db->execSqlCoro("SELECT id,account_number,account_name,COALESCE(currency_id,$3::uuid) AS currency_id FROM gl_accounts WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false AND status='active' AND allow_manual_posting=true AND is_control_account=false ORDER BY account_number,id",who.tenantId,unit,base);
  auto currencies=co_await db->execSqlCoro("SELECT id,code,name FROM core_currencies WHERE is_deleted=false AND is_active=true ORDER BY code,id");
  auto centers=co_await db->execSqlCoro("SELECT id,name FROM core_cost_centers WHERE tenant_id=$1 AND is_deleted=false ORDER BY lower(name),id",who.tenantId);
  auto periods=co_await db->execSqlCoro("SELECT id,period,period_start_date::text AS begin_date,period_end_date::text AS end_date FROM gl_accounting_periods WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false AND status='open' ORDER BY period DESC,id",who.tenantId,unit);
  for(auto key:{"accounts","currencies","costCenters","periods"})result.result[key]=Json::arrayValue;
  result.result["baseCurrencyId"]=base;
  for(auto& r:accounts){Json::Value v;v["id"]=r["id"].as<std::string>();v["accountNumber"]=r["account_number"].as<std::string>();v["name"]=r["account_name"].as<std::string>();v["currencyId"]=r["currency_id"].as<std::string>();result.result["accounts"].append(v);}
  for(auto& r:currencies){Json::Value v;for(auto k:{"id","code","name"})v[k]=r[k].as<std::string>();result.result["currencies"].append(v);}
  for(auto& r:centers){Json::Value v;v["id"]=r["id"].as<std::string>();v["name"]=r["name"].as<std::string>();result.result["costCenters"].append(v);}
  for(auto& r:periods){Json::Value v;v["id"]=r["id"].as<std::string>();v["period"]=r["period"].as<int>();v["beginDate"]=r["begin_date"].as<std::string>();v["endDate"]=r["end_date"].as<std::string>();result.result["periods"].append(v);}
  result.success=true;co_return result;
 }
 if(op=="next-number"){
  auto seq=co_await db->execSqlCoro("SELECT prefix,suffix,next_batch_number FROM gl_journal_batch_sequences WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false",who.tenantId,unit);
  std::string number=seq.empty()?"1":std::to_string(seq[0]["next_batch_number"].as<int>());if(number.size()<8)number.insert(0,8-number.size(),'0');std::string prefix=seq.empty()?"":seq[0]["prefix"].as<std::string>();
  result.result["batchNumber"]=(prefix.empty()?"GJ-":prefix)+number+(seq.empty()?"":seq[0]["suffix"].as<std::string>());result.result["reserved"]=false;result.success=true;co_return result;
 }
 if(op=="list"){auto rows=co_await db->execSqlCoro(selection()+" ORDER BY b.batch_date DESC,b.created_at DESC,b.id",who.tenantId,unit);result.result["items"]=Json::arrayValue;for(auto& r:rows)result.result["items"].append(decode(r));result.result["total"]=Json::UInt64(rows.size());result.success=true;co_return result;}
 Json::Value current;
 if(op=="get"||op=="update"||op=="delete"||op=="post"){
  const std::string select=selection()+" AND b.id=$3"+std::string(write?" FOR UPDATE OF b":"");auto rows=co_await db->execSqlCoro(select,who.tenantId,unit,id);if(rows.empty())co_return fail("not_found","Journal not found.");current=decode(rows[0]);
  if(op=="get"||(op=="post"&&current["status"]=="posted")){result.result=current;result.success=true;co_return result;}
  if(current["status"]!="draft")co_return fail("conflict","Only draft journals may be edited, deleted or posted.");
  auto processed=co_await db->execSqlCoro("SELECT l.id FROM gl_journal_lines l WHERE l.tenant_id=$1 AND l.accounting_unit_id=$2 AND l.journal_batch_id=$3 AND l.is_deleted=false AND (l.is_reconciled=true OR l.is_consolidated=true OR EXISTS(SELECT 1 FROM gl_bank_reconciliation_lines r JOIN gl_bank_reconciliations h ON h.id=r.reconciliation_id AND h.tenant_id=r.tenant_id AND h.accounting_unit_id=r.accounting_unit_id WHERE r.matched_journal_line_id=l.id AND r.tenant_id=l.tenant_id AND r.accounting_unit_id=l.accounting_unit_id AND h.status<>'voided')) LIMIT 1",who.tenantId,unit,id);
  if(!processed.empty())co_return fail("conflict","Reconciled/consolidated journal lines cannot be changed or posted again.");
  if(input["version"]!=current["version"])co_return fail("conflict","Journal changed. Refresh before editing, deleting or posting.");
  if(current["version"].asInt()==std::numeric_limits<int>::max())co_return fail("conflict","Journal version exhausted.");
 }
 if(op=="delete"){
  co_await db->execSqlCoro("UPDATE gl_journal_lines SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$4,last_modified_at=now(),last_modified_by_user_id=$4 WHERE tenant_id=$1 AND accounting_unit_id=$2 AND journal_batch_id=$3 AND is_deleted=false",who.tenantId,unit,id,who.userId);
  co_await db->execSqlCoro("UPDATE gl_journal_batches SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$4,last_modified_at=now(),last_modified_by_user_id=$4,version=version+1 WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$3 AND is_deleted=false AND status='draft'",who.tenantId,unit,id,who.userId);
  result.result["id"]=id;result.result["isDeleted"]=true;result.success=true;co_return result;
 }
 Json::Value body=op=="post"?editable(current):input;
 if(op=="post"&&input.isMember("periodId"))body["periodId"]=input["periodId"];
 auto normalized=co_await normalize(db,body,current,base,unit,who,write);if(!normalized.error.empty())co_return fail("validation_error",normalized.error);body=normalized.body;
 if(op=="validate"){result.result["valid"]=true;result.result["balanced"]=body["balanced"];result.result["debitTotal"]=body["totalDebit"];result.result["creditTotal"]=body["totalCredit"];result.result["errors"]=Json::arrayValue;result.success=true;co_return result;}
 if(!body["periodId"].isNull()){
  const std::string sql="SELECT status,period_start_date::text AS begin_date,period_end_date::text AS end_date FROM gl_accounting_periods WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$3 AND is_deleted=false"+std::string(write?" FOR UPDATE":"");const std::string period=body["periodId"].asString();auto periods=co_await db->execSqlCoro(sql,who.tenantId,unit,period);
  if(periods.empty())co_return fail("validation_error","Select a live accounting period in this unit.");
  if(op=="post"){
   if(periods[0]["status"].as<std::string>()!="open")co_return fail("conflict","Posting period is closed or locked.");const auto a=periods[0]["begin_date"].as<std::string>(),b=periods[0]["end_date"].as<std::string>();
   if(body["batchDate"].asString()<a||body["batchDate"].asString()>b)co_return fail("validation_error","Batch date must fall inside the posting period.");
   for(const auto& l:body["lines"])if(l["transactionDate"].asString()<a||l["transactionDate"].asString()>b)co_return fail("validation_error","All line dates must fall inside the posting period.");
  }
 }else if(op=="post")co_return fail("validation_error","Select an open accounting period before final posting.");
 if(op=="post"&&!body["balanced"].asBool())co_return fail("validation_error","Final posting requires positive, exactly balanced base-currency totals.");
 if(op=="post"){
  const std::string total=body["totalDebit"].asString();
  // Approval policies have an active flag, but no soft-delete column in 001.
  auto policies=co_await db->execSqlCoro("SELECT id FROM gl_approval_policies WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_active=true AND transaction_type IN('journal','general_journal') AND minimum_amount<=$3::numeric ORDER BY id FOR UPDATE",who.tenantId,unit,total);
  if(!policies.empty())co_return fail("approval_required","An active journal approval policy applies. Direct draft posting is not permitted.");
 }
 std::string saved=id,number=current["batchNumber"].isString()?current["batchNumber"].asString():"";
 if(op=="create"){
  co_await db->execSqlCoro("INSERT INTO gl_journal_batch_sequences(tenant_id,accounting_unit_id,created_by_user_id) VALUES($1,$2,$3) ON CONFLICT(tenant_id,accounting_unit_id) DO NOTHING",who.tenantId,unit,who.userId);
  auto seq=co_await db->execSqlCoro("UPDATE gl_journal_batch_sequences SET current_batch_number=next_batch_number,next_batch_number=next_batch_number+sequence_increment,last_modified_at=now(),last_modified_by_user_id=$3 WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false AND next_batch_number>0 AND next_batch_number<=2147483647-sequence_increment RETURNING prefix,suffix,current_batch_number",who.tenantId,unit,who.userId);
  if(seq.empty())co_return fail("conflict","Journal sequence is deleted or exhausted; configure a live sequence before saving.");std::string value=std::to_string(seq[0]["current_batch_number"].as<int>());if(value.size()<8)value.insert(0,8-value.size(),'0');std::string prefix=seq[0]["prefix"].as<std::string>();number=(prefix.empty()?"GJ-":prefix)+value+seq[0]["suffix"].as<std::string>();
 }
 body["batchNumber"]=number;const std::string payload=Json::FastWriter().write(body);
 if(op=="create"){
  auto rows=co_await db->execSqlCoro("INSERT INTO gl_journal_batches(tenant_id,accounting_unit_id,batch_number,batch_date,batch_description,total_debit,total_credit,period_id,created_by_user_id) VALUES($1,$2,$3::jsonb->>'batchNumber',($3::jsonb->>'batchDate')::date,$3::jsonb->>'description',($3::jsonb->>'totalDebit')::numeric,($3::jsonb->>'totalCredit')::numeric,($3::jsonb->>'periodId')::uuid,$4) RETURNING id",who.tenantId,unit,payload,who.userId);saved=rows[0]["id"].as<std::string>();
 }else{
  co_await db->execSqlCoro("UPDATE gl_journal_batches SET batch_date=($3::jsonb->>'batchDate')::date,batch_description=$3::jsonb->>'description',total_debit=($3::jsonb->>'totalDebit')::numeric,total_credit=($3::jsonb->>'totalCredit')::numeric,period_id=($3::jsonb->>'periodId')::uuid,last_modified_at=now(),last_modified_by_user_id=$4,version=version+1 WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$5 AND is_deleted=false AND status='draft'",who.tenantId,unit,payload,who.userId,saved);
 }
 // Archive removed periods before releasing retained positions; keep removed line history.
 co_await db->execSqlCoro("UPDATE gl_journal_lines l SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$4,last_modified_at=now(),last_modified_by_user_id=$4 WHERE l.tenant_id=$1 AND l.accounting_unit_id=$2 AND l.journal_batch_id=$3 AND l.is_deleted=false AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements($5::jsonb->'lines') x WHERE (x->>'id')::uuid=l.id)",who.tenantId,unit,saved,who.userId,payload);
 co_await db->execSqlCoro("UPDATE gl_journal_lines SET line_number=NULL WHERE tenant_id=$1 AND accounting_unit_id=$2 AND journal_batch_id=$3 AND is_deleted=false",who.tenantId,unit,saved);
 for(const auto& line:body["lines"]){
  const std::string values=Json::FastWriter().write(line);
  if(!line.isMember("id")){
   co_await db->execSqlCoro(R"(INSERT INTO gl_journal_lines(tenant_id,accounting_unit_id,journal_batch_id,account_id,account_name,cost_center_id,reference_number,cheque_number,description,debit_amount,credit_amount,base_debit_amount,base_credit_amount,transaction_date,is_multi_currency,currency_id,currency_name,currency_code,buy_rate,sell_rate,batch_date,standard_account_type,batch_number,line_number,created_by_user_id)
 VALUES($1,$2,$3,($4::jsonb->>'accountId')::uuid,$4::jsonb->>'accountName',($4::jsonb->>'costCenterId')::uuid,$4::jsonb->>'referenceNumber',$4::jsonb->>'chequeNumber',$4::jsonb->>'description',($4::jsonb->>'debit')::numeric,($4::jsonb->>'credit')::numeric,($4::jsonb->>'baseDebit')::numeric,($4::jsonb->>'baseCredit')::numeric,($4::jsonb->>'transactionDate')::date,($5::jsonb->>'isMultiCurrency')::boolean,($4::jsonb->>'currencyId')::uuid,$4::jsonb->>'currencyName',$4::jsonb->>'currencyCode',($4::jsonb->>'exchangeRate')::numeric,($4::jsonb->>'exchangeRate')::numeric,($5::jsonb->>'batchDate')::date,($4::jsonb->>'standardAccountType')::smallint,$5::jsonb->>'batchNumber',($4::jsonb->>'lineNumber')::integer,$6))",who.tenantId,unit,saved,values,payload,who.userId);
  }else{
   co_await db->execSqlCoro(R"(UPDATE gl_journal_lines SET account_id=($4::jsonb->>'accountId')::uuid,account_name=$4::jsonb->>'accountName',cost_center_id=($4::jsonb->>'costCenterId')::uuid,reference_number=$4::jsonb->>'referenceNumber',cheque_number=$4::jsonb->>'chequeNumber',description=$4::jsonb->>'description',debit_amount=($4::jsonb->>'debit')::numeric,credit_amount=($4::jsonb->>'credit')::numeric,base_debit_amount=($4::jsonb->>'baseDebit')::numeric,base_credit_amount=($4::jsonb->>'baseCredit')::numeric,transaction_date=($4::jsonb->>'transactionDate')::date,is_multi_currency=($5::jsonb->>'isMultiCurrency')::boolean,currency_id=($4::jsonb->>'currencyId')::uuid,currency_name=$4::jsonb->>'currencyName',currency_code=$4::jsonb->>'currencyCode',buy_rate=($4::jsonb->>'exchangeRate')::numeric,sell_rate=($4::jsonb->>'exchangeRate')::numeric,batch_date=($5::jsonb->>'batchDate')::date,standard_account_type=($4::jsonb->>'standardAccountType')::smallint,line_number=($4::jsonb->>'lineNumber')::integer,last_modified_at=now(),last_modified_by_user_id=$6
 WHERE tenant_id=$1 AND accounting_unit_id=$2 AND journal_batch_id=$3 AND id=($4::jsonb->>'id')::uuid AND is_deleted=false)",who.tenantId,unit,saved,values,payload,who.userId);
  }
 }
 if(op=="post"){
  co_await db->execSqlCoro(R"(INSERT INTO gl_account_balances(tenant_id,accounting_unit_id,account_id,organization_unit_id,cost_center_id,currency_id,debit_balance,credit_balance,foreign_debit_balance,foreign_credit_balance,buy_rate,sell_rate)
 SELECT tenant_id,accounting_unit_id,account_id,organization_unit_id,cost_center_id,currency_id,sum(base_debit_amount),sum(base_credit_amount),sum(debit_amount),sum(credit_amount),round(sum(buy_rate*(debit_amount+credit_amount))/sum(debit_amount+credit_amount),10),round(sum(sell_rate*(debit_amount+credit_amount))/sum(debit_amount+credit_amount),10)
 FROM gl_journal_lines WHERE tenant_id=$1 AND accounting_unit_id=$2 AND journal_batch_id=$3 AND is_deleted=false GROUP BY tenant_id,accounting_unit_id,account_id,organization_unit_id,cost_center_id,currency_id
 ON CONFLICT ON CONSTRAINT uq_gl_account_balances_dimensions DO UPDATE SET debit_balance=gl_account_balances.debit_balance+EXCLUDED.debit_balance,credit_balance=gl_account_balances.credit_balance+EXCLUDED.credit_balance,foreign_debit_balance=gl_account_balances.foreign_debit_balance+EXCLUDED.foreign_debit_balance,foreign_credit_balance=gl_account_balances.foreign_credit_balance+EXCLUDED.foreign_credit_balance,buy_rate=EXCLUDED.buy_rate,sell_rate=EXCLUDED.sell_rate,updated_at=now())",who.tenantId,unit,saved);
  co_await db->execSqlCoro("UPDATE gl_journal_batches SET status='posted',posted_at=now(),posted_by_user_id=$4 WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$3 AND status='draft' AND is_deleted=false",who.tenantId,unit,saved,who.userId);
  co_await db->execSqlCoro("INSERT INTO gl_journal_history(tenant_id,accounting_unit_id,journal_batch_id,batch_number,batch_date,total_credit,total_debit,journal_details,captured_by_user_id,created_by_user_id) SELECT tenant_id,accounting_unit_id,id,batch_number,batch_date,total_credit,total_debit,$4::jsonb->'lines',$5,$5 FROM gl_journal_batches WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$3 AND is_deleted=false",who.tenantId,unit,saved,payload,who.userId);
 }
 auto rows=co_await db->execSqlCoro(selection()+" AND b.id=$3",who.tenantId,unit,saved);result.result=decode(rows[0]);result.success=true;co_return result;
}
}
drogon::Task<dto::BaseApiResponse> JournalService::execute(std::string op,std::string id,std::string unit,Json::Value body,utils::AuditIdentity who){
 if(!uuid(who.tenantId)||!uuid(who.userId))co_return fail("unauthorized","Tenant authentication required.");
 if(op!="list"&&op!="get"&&op!="options"&&op!="next-number"&&op!="create"&&op!="update"&&op!="delete"&&op!="post"&&op!="validate")co_return fail("validation_error","Invalid operation.");
 if(!uuid(unit)||((op=="get"||op=="update"||op=="delete"||op=="post")&&!uuid(id)))co_return fail("validation_error","Valid accounting-unit and journal UUIDs required.");
 if(op=="create"||op=="update"||op=="validate"||op=="delete"||op=="post"){
  if(!body.isObject()||!body["accountingUnitId"].isString()||lower(body["accountingUnitId"].asString())!=lower(unit))co_return fail("validation_error","Accounting-unit scope mismatch.");
  for(auto& k:body.getMemberNames()){
   bool common=k=="accountingUnitId",version=k=="version"&&(op=="update"||op=="delete"||op=="post"),period=k=="periodId"&&op!="delete",draft=(op=="create"||op=="update"||op=="validate")&&(k=="batchDate"||k=="description"||k=="isMultiCurrency"||k=="lines");
   if(!common&&!version&&!period&&!draft)co_return fail("validation_error","Unexpected journal field; status, scope, numbers and audits are server-owned.");
  }
  if((op=="update"||op=="delete"||op=="post")&&(!body["version"].isInt()||body["version"].asInt()<1))co_return fail("validation_error","Supply the current journal version.");
 }
 try{
  auto db=drogon::app().getDbClient();if(!(co_await ready(db)))co_return fail("schema_not_ready","Journal database upgrade required. Apply database/migrations/012_journals.sql after prior migrations.");
  if(op=="list"||op=="get"||op=="options"||op=="next-number"||op=="validate")co_return co_await run(db,op,id,unit,body,who);
  auto tx=co_await db->newTransactionCoro();dto::BaseApiResponse r;
  try{r=co_await run(tx,op,id,unit,body,who);}catch(...){tx->rollback();throw;}
  if(!r.success){tx->rollback();co_return r;}
  if(!(co_await utils::CommitTransaction{std::move(tx)}))co_return fail("database_error","Unable to commit journal.");co_return r;
 }catch(const UniqueViolation&){co_return fail("conflict","Journal number or request key is already reserved.");}
 catch(const std::exception&){co_return fail("database_error","Journal service unavailable.");}
}
}
