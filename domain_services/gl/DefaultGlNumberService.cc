#include "DefaultGlNumberService.h"
#include "dto/DefaultGlFields.h"
#include "utils/TransactionUtil.h"
#include <regex>
#include <cmath>
#include <cctype>
#include <map>
#include <set>
namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
using dto::default_gl::fields;
dto::BaseApiResponse fail(const char* code,const char* message){dto::BaseApiResponse r;r.error["code"]=code;r.error["message"]=message;return r;}
bool uuid(const std::string& s){static const std::regex p("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");return std::regex_match(s,p);}
std::string lower(std::string s){for(auto& c:s)c=static_cast<char>(std::tolower(static_cast<unsigned char>(c)));return s;}
bool known(const std::string& k){if(k=="vatRate"||k=="accountingUnitId")return true;for(auto& f:fields)if(k==f.name)return true;return false;}
Json::Value defaults(){Json::Value b;for(auto& f:fields)b[f.name]=Json::nullValue;b["vatRate"]=0;return b;}
bool validate(Json::Value& b){
 if(!b["vatRate"].isNumeric())return false;const double rate=b["vatRate"].asDouble();
 if(!std::isfinite(rate)||rate<0||rate>1||std::abs(rate*1000000-std::round(rate*1000000))>0.000001)return false;
 for(auto& f:fields){auto& v=b[f.name];if(v.isNull())continue;if(!v.isString())return false;auto s=v.asString();if(s.empty()||s=="00000000-0000-0000-0000-000000000000")v=Json::nullValue;else if(!uuid(s))return false;else v=lower(s);}
 return true;
}
std::string projection(){std::string sql="jsonb_build_object('id',id,'accountingUnitId',accounting_unit_id,'vatRate',vat_rate";for(auto& f:fields)sql+=",'"+std::string(f.name)+"',"+f.column;return sql+") AS record";}
Json::Value decode(const Row& row){Json::Value b;Json::Reader reader;if(!reader.parse(row["record"].as<std::string>(),b))throw std::runtime_error("Invalid default GL record");return b;}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db,std::string op,std::string id,std::string unit,Json::Value input,utils::AuditIdentity who){
 const bool write=op!="get"&&op!="list"&&op!="options";
 const std::string unitSql="SELECT id FROM core_accounting_units WHERE tenant_id=$1 AND id=$2 AND is_deleted=false AND is_active=true"+std::string(write?" FOR UPDATE":"");
 auto units=co_await db->execSqlCoro(unitSql,who.tenantId,unit);if(units.empty())co_return fail("not_found","Choose an active accounting unit in this tenant.");
 dto::BaseApiResponse r;
 if(op=="options"){
  // Live, active reference choices only; banks also require a live active backing GL account.
  auto accounts=co_await db->execSqlCoro("SELECT id,account_number || ' · ' || account_name AS label FROM gl_accounts WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false AND status='active' ORDER BY account_number,id",who.tenantId,unit);
  auto banks=co_await db->execSqlCoro("SELECT b.id,COALESCE(b.bank_name,'Bank') || ' · ' || b.account_number AS label FROM gl_bank_accounts b JOIN gl_accounts a ON a.id=b.account_id AND a.tenant_id=b.tenant_id AND a.accounting_unit_id=b.accounting_unit_id WHERE b.tenant_id=$1 AND b.accounting_unit_id=$2 AND b.is_deleted=false AND b.is_active=true AND a.is_deleted=false AND a.status='active' ORDER BY b.account_number,b.id",who.tenantId,unit);
  auto categories=co_await db->execSqlCoro("SELECT id,name AS label FROM gl_imprest_categories WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false ORDER BY lower(name),id",who.tenantId,unit);
  auto append=[&](const char* key,const auto& rows){r.result[key]=Json::arrayValue;for(auto& row:rows){Json::Value v;v["value"]=row["id"].template as<std::string>();v["label"]=row["label"].template as<std::string>();r.result[key].append(v);}};
  append("account",accounts);append("bank",banks);append("category",categories);r.success=true;co_return r;
 }
 const std::string select="SELECT "+projection()+" FROM gl_default_accounts WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false"+std::string(write?" FOR UPDATE":"");
 auto rows=co_await db->execSqlCoro(select,who.tenantId,unit);
 if(op=="list"){r.result["data"]=Json::arrayValue;for(auto& row:rows)r.result["data"].append(decode(row));r.result["totalCount"]=Json::UInt64(rows.size());r.success=true;co_return r;}
 if(op=="create"&&!rows.empty())co_return fail("conflict","This accounting unit already has a live default GL configuration.");
 if(op!="create"&&(rows.empty()||lower(decode(rows[0])["id"].asString())!=lower(id)))co_return fail("not_found","Default GL Numbers not found in this accounting unit.");
 if(op=="get"){r.success=true;r.result=decode(rows[0]);co_return r;}
 if(op=="delete"){
  co_await db->execSqlCoro("UPDATE gl_default_accounts SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$4,last_modified_at=now(),last_modified_by_user_id=$4 WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$3 AND is_deleted=false",who.tenantId,unit,id,who.userId);
  r.result["id"]=id;r.result["isDeleted"]=true;r.success=true;co_return r;
 }
 auto body=rows.empty()?defaults():decode(rows[0]);body.removeMember("id");body.removeMember("accountingUnitId");
 for(auto& key:input.getMemberNames())if(key!="accountingUnitId")body[key]=input[key];
 if(!validate(body))co_return fail("validation_error","Select valid references and a VAT fraction from 0 to 1 with up to six decimals.");
 // Deterministic locking avoids duplicate locks and stabilizes references until commit.
 std::map<std::string,std::set<std::string>> references;
 for(auto& f:fields)if(!body[f.name].isNull())references[f.table].insert(body[f.name].asString());
 for(auto& [table,ids]:references)for(auto& ref:ids){
  const std::string condition=table=="gl_accounts"?" AND status='active'":table=="gl_bank_accounts"?" AND is_active=true":"";
  const std::string sql="SELECT id FROM "+table+" WHERE tenant_id=$1 AND accounting_unit_id=$2 AND id=$3 AND is_deleted=false"+condition+" FOR UPDATE";
  auto valid=co_await db->execSqlCoro(sql,who.tenantId,unit,ref);if(valid.empty())co_return fail("validation_error","A reference is unavailable, inactive or belongs to another tenant/accounting unit.");
  if(table=="gl_bank_accounts"){
   auto backing=co_await db->execSqlCoro("SELECT a.id FROM gl_accounts a JOIN gl_bank_accounts b ON b.account_id=a.id AND b.tenant_id=a.tenant_id AND b.accounting_unit_id=a.accounting_unit_id WHERE b.tenant_id=$1 AND b.accounting_unit_id=$2 AND b.id=$3 AND b.is_deleted=false AND b.is_active=true AND a.is_deleted=false AND a.status='active' FOR UPDATE OF a",who.tenantId,unit,ref);
   if(backing.empty())co_return fail("validation_error","Bank account must have a live active GL account in this unit.");
  }
 }
 const std::string payload=Json::FastWriter().write(body);
 std::string sql;
 if(op=="create"){
  std::string columns="tenant_id,accounting_unit_id,created_by_user_id,vat_rate",values="$1::uuid,$2::uuid,$4::uuid,($3::jsonb->>'vatRate')::numeric(9,6)";
  for(auto& f:fields){columns+=","+std::string(f.column);values+=",($3::jsonb->>'"+std::string(f.name)+"')::uuid";}
  sql="INSERT INTO gl_default_accounts ("+columns+") VALUES ("+values+") RETURNING "+projection();
 }else{
  sql="UPDATE gl_default_accounts SET last_modified_at=now(),last_modified_by_user_id=$4,vat_rate=($3::jsonb->>'vatRate')::numeric(9,6)";
  for(auto& f:fields)sql+=","+std::string(f.column)+"=($3::jsonb->>'"+f.name+"')::uuid";
  sql+=" WHERE tenant_id=$1 AND accounting_unit_id=$2 AND is_deleted=false RETURNING "+projection();
 }
 auto saved=co_await db->execSqlCoro(sql,who.tenantId,unit,payload,who.userId);r.result=decode(saved[0]);r.success=true;co_return r;
}
}
drogon::Task<dto::BaseApiResponse> DefaultGlNumberService::execute(std::string op,std::string id,std::string unit,Json::Value body,utils::AuditIdentity who){
 if(!uuid(who.tenantId)||!uuid(who.userId))co_return fail("unauthorized","Tenant authentication required.");
 if(op!="list"&&op!="options"&&op!="get"&&op!="create"&&op!="update"&&op!="delete")co_return fail("validation_error","Invalid operation.");
 if(!uuid(unit)||((op=="get"||op=="update"||op=="delete")&&!uuid(id)))co_return fail("validation_error","Valid accounting unit and record IDs required.");
 if(op=="create"||op=="update"){
  if(!body.isObject())co_return fail("validation_error","A default GL configuration object is required.");
  if(body.isMember("payRollBankAccountId")){
   if(body.isMember("payrollBankAccountId"))co_return fail("validation_error","Specify one payroll bank field.");
   body["payrollBankAccountId"]=body["payRollBankAccountId"];body.removeMember("payRollBankAccountId");
  }
  for(auto& k:body.getMemberNames())if(!known(k))co_return fail("validation_error","Unexpected default GL field.");
  if(!body["accountingUnitId"].isString()||lower(body["accountingUnitId"].asString())!=lower(unit))co_return fail("validation_error","Accounting unit scope does not match.");
 }
 try{
  auto db=drogon::app().getDbClient();if(op=="list"||op=="get"||op=="options")co_return co_await run(db,op,id,unit,body,who);
  auto tx=co_await db->newTransactionCoro();auto result=co_await run(tx,op,id,unit,body,who);if(!result.success){tx->rollback();co_return result;}
  if(!(co_await utils::CommitTransaction{std::move(tx)}))co_return fail("database_error","Unable to commit default GL changes.");co_return result;
 }catch(const UniqueViolation&){co_return fail("conflict","This accounting unit already has default GL Numbers.");}
 catch(const std::exception&){co_return fail("database_error","Default GL Numbers service unavailable.");}
}
}
