#include "BudgetService.h"
#include "utils/TransactionUtil.h"
#include <regex>
#include <set>
#include <cctype>
namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
dto::BaseApiResponse fail(const char* code,const char* message){dto::BaseApiResponse r;r.error["code"]=code;r.error["message"]=message;return r;}
bool uuid(const std::string& s){static const std::regex p("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");return std::regex_match(s,p)&&s!="00000000-0000-0000-0000-000000000000";}
std::string lower(std::string s){for(auto& c:s)c=static_cast<char>(std::tolower(static_cast<unsigned char>(c)));return s;}
bool optionalId(Json::Value& v){if(v.isNull())return true;if(!v.isString())return false;auto s=v.asString();if(s.empty()||s=="00000000-0000-0000-0000-000000000000")v=Json::nullValue;else if(!uuid(s))return false;else v=lower(s);return true;}
int period(const Json::Value& value){if(!value.isString())return -1;const auto s=value.asString();if(!std::regex_match(s,std::regex("^[0-9]{4}-[0-9]{2}-01$")))return -1;int y=std::stoi(s.substr(0,4)),m=std::stoi(s.substr(5,2));return y>=1900&&y<=2999&&m>=1&&m<=12?y*12+m-1:-1;}
bool amount(const Json::Value& v){static const std::regex p("^(0|[1-9][0-9]{0,13})(\\.[0-9]{1,6})?$");return v.isString()&&std::regex_match(v.asString(),p);}
bool valid(Json::Value& body){
 if(!body["accountId"].isString()||!uuid(body["accountId"].asString())||!optionalId(body["costCenterId"]))return false;body["accountId"]=lower(body["accountId"].asString());
 const int begin=period(body["beginDate"]),end=period(body["endDate"]);if(begin<0||end<begin||end-begin>=60)return false;
 const auto& details=body["details"];if(!details.isArray()||details.size()!=static_cast<unsigned>(end-begin+1))return false;std::set<int> seen;
 for(const auto& line:details){if(!line.isObject())return false;for(const auto& k:line.getMemberNames())if(k!="year"&&k!="month"&&k!="budgetAmount"&&k!="revisedAmount")return false;
  if(!line["year"].isInt()||!line["month"].isInt())return false;int y=line["year"].asInt(),m=line["month"].asInt();if(y<1900||y>2999||m<1||m>12)return false;int p=y*12+m-1;
  if(p<begin||p>end||!seen.insert(p).second||!amount(line["budgetAmount"])||!amount(line["revisedAmount"]))return false;
 }return true;
}
// Do not issue Budget queries against the original 001 detail schema. Besides
// is_deleted, writes require the audit columns and partial unique indexes from
// migration 011. Check the resolved relations (respecting the app search_path),
// not a hard-coded public schema. No cache: applying the migration repairs the
// next request without restarting. Never run DDL with the request's DB role.
drogon::Task<bool> schemaReady(DbClientPtr db){
 auto rows=co_await db->execSqlCoro(R"(SELECT
  (SELECT count(*)=5 FROM pg_attribute WHERE attrelid=to_regclass('gl_budget_details')
   AND attnum>0 AND NOT attisdropped AND attname IN
   ('is_deleted','last_modified_at','last_modified_by_user_id','deleted_at','deleted_by_user_id'))
  AND EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('uq_gl_budget_details_live_period')
   AND indrelid=to_regclass('gl_budget_details') AND indisunique AND indisvalid AND indisready AND indpred IS NOT NULL)
  AND EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('uq_gl_budgets_live_schedule')
   AND indrelid=to_regclass('gl_budgets') AND indisunique AND indisvalid AND indisready AND indpred IS NOT NULL)
  AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('gl_budgets')
   AND conname='fk_gl_budgets_cost_center' AND contype='f') AS ready)");
 co_return !rows.empty()&&rows[0]["ready"].as<bool>();
}
std::string projection(){return R"(jsonb_build_object('id',b.id,'accountingUnitId',b.accounting_unit_id,'accountId',b.account_id,'accountName',COALESCE(b.account_name,''),
'accountNumber',COALESCE((SELECT account_number FROM gl_accounts WHERE id=b.account_id AND tenant_id=b.tenant_id AND accounting_unit_id=b.accounting_unit_id AND is_deleted=false),''),
'organizationUnitId',b.organization_unit_id,'organizationUnitName',COALESCE(b.organization_unit_name,''),'costCenterId',b.cost_center_id,
'costCenterName',COALESCE((SELECT name FROM core_cost_centers WHERE id=b.cost_center_id AND tenant_id=b.tenant_id AND is_deleted=false),''),
'beginDate',b.begin_date,'endDate',b.end_date,'status',b.status,'details',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',d.id,'year',d.year,'month',d.month,'budgetAmount',d.budget_amount::text,'revisedAmount',d.revised_amount::text) ORDER BY d.year,d.month) FROM gl_budget_details d WHERE d.budget_id=b.id AND d.tenant_id=b.tenant_id AND d.accounting_unit_id=b.accounting_unit_id AND d.is_deleted=false),'[]'::jsonb)) AS record)";}
Json::Value decode(const Row& row){Json::Value b;Json::Reader reader;if(!reader.parse(row["record"].as<std::string>(),b))throw std::runtime_error("Invalid budget");return b;}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db,std::string op,std::string id,std::string unit,Json::Value input,utils::AuditIdentity who){
 const bool write=op=="create"||op=="update"||op=="delete";
 const std::string unitSql="SELECT id FROM core_accounting_units WHERE tenant_id=$1 AND id=$2 AND is_deleted=false AND is_active=true"+std::string(write?" FOR UPDATE":"");
 auto units=co_await db->execSqlCoro(unitSql,who.tenantId,unit);if(units.empty())co_return fail("not_found","Active accounting unit not found.");
 dto::BaseApiResponse r;
 if(op=="options"){
  auto accounts=co_await db->execSqlCoro("SELECT id,account_name,account_number FROM gl_accounts WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false AND status='active' ORDER BY account_number,id",who.tenantId,unit);
  auto centers=co_await db->execSqlCoro("SELECT id,name FROM core_cost_centers WHERE tenant_id=$1 AND is_deleted=false ORDER BY lower(name),id",who.tenantId);
  r.result["accounts"]=Json::arrayValue;r.result["costCenters"]=Json::arrayValue;
  for(auto& row:accounts){Json::Value v;v["id"]=row["id"].as<std::string>();v["name"]=row["account_name"].as<std::string>();v["accountNumber"]=row["account_number"].as<std::string>();r.result["accounts"].append(v);}
  for(auto& row:centers){Json::Value v;v["id"]=row["id"].as<std::string>();v["name"]=row["name"].as<std::string>();r.result["costCenters"].append(v);}r.success=true;co_return r;
 }
 const std::string select="SELECT "+projection()+" FROM gl_budgets b WHERE b.tenant_id=$1 AND b.accounting_unit_id=$2 AND b.is_deleted=false";
 if(op=="list"){auto rows=co_await db->execSqlCoro(select+" ORDER BY b.begin_date DESC,b.id",who.tenantId,unit);r.result["data"]=Json::arrayValue;for(auto& row:rows)r.result["data"].append(decode(row));r.result["totalCount"]=Json::UInt64(rows.size());r.success=true;co_return r;}
 Json::Value current;
 if(op!="create"){
  const std::string sql=select+" AND b.id=$3"+std::string(write?" FOR UPDATE OF b":"");auto rows=co_await db->execSqlCoro(sql,who.tenantId,unit,id);if(rows.empty())co_return fail("not_found","Budget not found.");current=decode(rows[0]);
  if(op=="get"){r.success=true;r.result=current;co_return r;}
  if(current["status"]!="draft")co_return fail("conflict","Only draft budgets can be edited or deleted.");
  auto links=co_await db->execSqlCoro("SELECT l.id FROM gl_budget_composite_lines l JOIN gl_budget_composites c ON c.id=l.composite_id AND c.tenant_id=l.tenant_id AND c.accounting_unit_id=l.accounting_unit_id WHERE l.tenant_id=$1 AND l.accounting_unit_id=$2 AND l.budget_id=$3 AND c.is_deleted=false LIMIT 1",who.tenantId,unit,id);
  if(!links.empty())co_return fail("conflict","A live budget composite references this schedule.");
 }
 if(op=="delete"){
  co_await db->execSqlCoro("UPDATE gl_budget_details SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$4,last_modified_at=now(),last_modified_by_user_id=$4 WHERE tenant_id=$1 AND accounting_unit_id=$2 AND budget_id=$3 AND is_deleted=false",who.tenantId,unit,id,who.userId);
  co_await db->execSqlCoro("UPDATE gl_budgets SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$4,last_modified_at=now(),last_modified_by_user_id=$4 WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$3 AND is_deleted=false",who.tenantId,unit,id,who.userId);
  r.result["id"]=id;r.result["isDeleted"]=true;r.success=true;co_return r;
 }
 Json::Value body;
 if(current.isNull()){body["costCenterId"]=Json::nullValue;body["organizationUnitId"]=Json::nullValue;body["organizationUnitName"]="";}
 else {body=current;for(auto& line:body["details"])line.removeMember("id");}
 for(auto& k:input.getMemberNames())if(k!="accountingUnitId"&&k!="status")body[k]=input[k];
 if(input.isMember("organizationUnitId")){
  if(!optionalId(body["organizationUnitId"])||!body["organizationUnitId"].isNull())co_return fail("validation_error","Organizational-unit catalog is not connected; no new assignments accepted.");body["organizationUnitName"]="";
 }
 if(!valid(body))co_return fail("validation_error","Use an active GL, monthly bounds, complete unique monthly lines and nonnegative decimal-string amounts (14 integer and 6 fractional digits).");
 const std::string account=body["accountId"].asString(),center=body["costCenterId"].isNull()?"":body["costCenterId"].asString();
 auto accounts=co_await db->execSqlCoro("SELECT account_name FROM gl_accounts WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$3 AND is_deleted=false AND status='active' FOR UPDATE",who.tenantId,unit,account);if(accounts.empty())co_return fail("validation_error","Choose a live active GL account in this unit.");
 if(!center.empty()){auto centers=co_await db->execSqlCoro("SELECT id FROM core_cost_centers WHERE tenant_id=$1 AND id=$2 AND is_deleted=false FOR UPDATE",who.tenantId,center);if(centers.empty())co_return fail("validation_error","Choose a live cost center in this tenant.");}
 body["accountName"]=accounts[0]["account_name"].as<std::string>();
 const std::string payload=Json::FastWriter().write(body);
 std::string savedId=id;
 if(op=="create"){
  auto rows=co_await db->execSqlCoro("INSERT INTO gl_budgets(tenant_id,accounting_unit_id,account_id,account_name,cost_center_id,begin_date,end_date,created_by_user_id) VALUES($1,$2,($3::jsonb->>'accountId')::uuid,$3::jsonb->>'accountName',($3::jsonb->>'costCenterId')::uuid,($3::jsonb->>'beginDate')::date,($3::jsonb->>'endDate')::date,$4) RETURNING id",who.tenantId,unit,payload,who.userId);savedId=rows[0]["id"].as<std::string>();
 }else{
  co_await db->execSqlCoro("UPDATE gl_budgets SET account_id=($3::jsonb->>'accountId')::uuid,account_name=$3::jsonb->>'accountName',cost_center_id=($3::jsonb->>'costCenterId')::uuid,organization_unit_id=($3::jsonb->>'organizationUnitId')::uuid,organization_unit_name=$3::jsonb->>'organizationUnitName',begin_date=($3::jsonb->>'beginDate')::date,end_date=($3::jsonb->>'endDate')::date,last_modified_at=now(),last_modified_by_user_id=$4 WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$5 AND is_deleted=false",who.tenantId,unit,payload,who.userId,id);
 }
 // Archive removed periods; never mutate already-deleted detail history.
 co_await db->execSqlCoro("UPDATE gl_budget_details d SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$4,last_modified_at=now(),last_modified_by_user_id=$4 WHERE d.tenant_id=$1 AND d.accounting_unit_id=$2 AND d.budget_id=$3 AND d.is_deleted=false AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements($5::jsonb->'details') x WHERE (x->>'year')::int=d.year AND (x->>'month')::int=d.month)",who.tenantId,unit,savedId,who.userId,payload);
 for(const auto& line:body["details"]){
  const std::string values=Json::FastWriter().write(line);
  co_await db->execSqlCoro("INSERT INTO gl_budget_details(tenant_id,accounting_unit_id,budget_id,year,month,budget_amount,revised_amount,created_by_user_id) VALUES($1,$2,$3,($4::jsonb->>'year')::smallint,($4::jsonb->>'month')::smallint,($4::jsonb->>'budgetAmount')::numeric,($4::jsonb->>'revisedAmount')::numeric,$5) ON CONFLICT(tenant_id,accounting_unit_id,budget_id,year,month) WHERE is_deleted=false DO UPDATE SET budget_amount=EXCLUDED.budget_amount,revised_amount=EXCLUDED.revised_amount,last_modified_at=now(),last_modified_by_user_id=$5",who.tenantId,unit,savedId,values,who.userId);
 }
 auto rows=co_await db->execSqlCoro(select+" AND b.id=$3",who.tenantId,unit,savedId);r.result=decode(rows[0]);r.success=true;co_return r;
}
}
drogon::Task<dto::BaseApiResponse> BudgetService::execute(std::string op,std::string id,std::string unit,Json::Value body,utils::AuditIdentity who){
 if(!uuid(who.tenantId)||!uuid(who.userId))co_return fail("unauthorized","Tenant authentication required.");
 if(op!="list"&&op!="get"&&op!="options"&&op!="create"&&op!="update"&&op!="delete")co_return fail("validation_error","Invalid operation.");
 if(!uuid(unit)||((op=="get"||op=="update"||op=="delete")&&!uuid(id)))co_return fail("validation_error","Valid unit and record UUIDs required.");
 if(op=="create"||op=="update"){
  if(!body.isObject())co_return fail("validation_error","Budget object required.");
  for(auto& k:body.getMemberNames())if(k!="accountingUnitId"&&k!="accountId"&&k!="costCenterId"&&k!="organizationUnitId"&&k!="beginDate"&&k!="endDate"&&k!="details"&&k!="status")co_return fail("validation_error","Unexpected budget field.");
  if(!body["accountingUnitId"].isString()||lower(body["accountingUnitId"].asString())!=lower(unit))co_return fail("validation_error","Accounting unit scope mismatch.");
  if(body.isMember("status")&&body["status"]!="draft")co_return fail("validation_error","This CRUD API does not perform budget approval/status transitions.");
 }
 try{
  auto db=drogon::app().getDbClient();
  if(!(co_await schemaReady(db)))co_return fail("schema_not_ready","Budget database upgrade required. Apply database/migrations/011_budgets.sql to the backend database.");
  if(op=="list"||op=="get"||op=="options")co_return co_await run(db,op,id,unit,body,who);
  auto tx=co_await db->newTransactionCoro();dto::BaseApiResponse r;
  // Drogon commits when the last transaction owner is released. Explicitly
  // roll back even non-SQL exceptions (e.g. serialization) after any writes.
  try {r=co_await run(tx,op,id,unit,body,who);}catch(...){tx->rollback();throw;}
  if(!r.success){tx->rollback();co_return r;}
  if(!(co_await utils::CommitTransaction{std::move(tx)}))co_return fail("database_error","Unable to commit budget.");co_return r;
 }catch(const UniqueViolation&){co_return fail("conflict","A live budget already exists for this account, dimensions and date range.");}
 catch(const std::exception&){co_return fail("database_error","Budget service unavailable.");}
}
}
