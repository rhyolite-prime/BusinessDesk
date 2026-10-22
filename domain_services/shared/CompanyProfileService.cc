#include "CompanyProfileService.h"
#include "dto/CompanyProfileFields.h"
#include "utils/CompanyProfileSecret.h"
#include "utils/TransactionUtil.h"
#include <algorithm>
#include <cctype>
#include <cmath>
#include <regex>
namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
using dto::company_profile::fields;
dto::BaseApiResponse fail(const char* code,const char* message){dto::BaseApiResponse r;r.error["code"]=code;r.error["message"]=message;return r;}
bool uuid(const std::string& value){static const std::regex pattern("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");return std::regex_match(value,pattern);}
std::string trim(std::string s){auto a=s.find_first_not_of(" \t\r\n"),b=s.find_last_not_of(" \t\r\n");return a==std::string::npos?"":s.substr(a,b-a+1);}
Json::Value defaults(){Json::Value b;for(const auto& f:fields){if(f.kind=='b')b[f.name]=false;else if(f.kind=='u')b[f.name]=Json::nullValue;else if(f.kind=='r'||f.kind=='i')b[f.name]=std::string(f.name)=="firstMonthOfFiscalYear"?1:0;else b[f.name]="";}return b;}
bool known(const std::string& key){if(key=="emailPassword"||key=="clearEmailPassword"||key=="defaultCurrenyId")return true;for(const auto& f:fields)if(key==f.name)return true;return false;}
bool valid(Json::Value& b){
 for(const auto& f:fields){auto& v=b[f.name];
  if(f.kind=='b'){if(!v.isBool())return false;}
  else if(f.kind=='i'){if(!v.isInt()||v.asInt()<0||v.asInt()>f.limit||(std::string(f.name)=="firstMonthOfFiscalYear"&&v.asInt()<1))return false;}
  else if(f.kind=='r'){if(!v.isNumeric()||!std::isfinite(v.asDouble())||v.asDouble()<0||v.asDouble()>100||std::abs(v.asDouble()*1000000-std::round(v.asDouble()*1000000))>0.000001)return false;}
  else if(f.kind=='u'){
   if(v.isNull())continue;if(!v.isString())return false;auto text=trim(v.asString());if(text.empty()||text=="00000000-0000-0000-0000-000000000000")v=Json::nullValue;else if(!uuid(text))return false;else v=text;
  }else{if(!v.isString())return false;auto text=trim(v.asString());if(text.size()>static_cast<size_t>(f.limit)||text.find('\0')!=std::string::npos)return false;v=text;}
 }
 if(b["companyName"].asString().empty()||b["defaultCurrencyId"].isNull())return false;
 const std::regex email(R"(^[^\s@]+@[^\s@]+\.[^\s@]+$)");
 for(const auto& key:{"email","primaryEmailAddress"})if(!b[key].asString().empty()&&!std::regex_match(b[key].asString(),email))return false;
 const auto host=b["mailHostName"].asString();if(!host.empty()&&(std::any_of(host.begin(),host.end(),[](unsigned char c){return std::isspace(c)||c<32||c==127||c=='/'||c=='\\'||c=='@';})||b["portNumber"].asInt()<1||b["primaryEmailAddress"].asString().empty()))return false;
 const auto logo=b["companyLogoUrl"].asString();if(std::any_of(logo.begin(),logo.end(),[](unsigned char c){return c<32||c==127||c=='\\';}))return false;if(!logo.empty()&&!(logo.starts_with("https://")||logo.starts_with("http://")||(logo.starts_with("/")&&!logo.starts_with("//"))))return false;
 return true;
}
std::string publicSelect(){std::string sql="jsonb_build_object('id',id,'hasEmailPassword',email_password_encrypted IS NOT NULL";for(const auto& f:fields)sql+=",'"+std::string(f.name)+"',"+f.column;return sql+") AS profile";}
Json::Value decode(const Row& row){Json::Value b;Json::Reader reader;if(!reader.parse(row["profile"].as<std::string>(),b))throw std::runtime_error("Invalid profile data");return b;}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db,std::string op,Json::Value input,utils::AuditIdentity who){
 const bool write=op!="get";
 if(write){auto tenant=co_await db->execSqlCoro("SELECT id FROM tenants WHERE id=$1 AND is_deleted=false FOR UPDATE",who.tenantId);if(tenant.empty())co_return fail("not_found","Tenant not available.");}
 const std::string select="SELECT "+publicSelect()+" FROM core_company_profiles WHERE tenant_id=$1 AND is_deleted=false"+std::string(write?" FOR UPDATE":"");
 auto current=co_await db->execSqlCoro(select,who.tenantId);
 if(op=="get"){if(current.empty())co_return fail("not_found","Company profile has not been created.");dto::BaseApiResponse r;r.success=true;r.result=decode(current[0]);co_return r;}
 if(op=="create"&&!current.empty())co_return fail("conflict","This tenant already has a company profile.");
 if(op=="update"&&current.empty())co_return fail("not_found","Create the company profile first.");
 auto body=current.empty()?defaults():decode(current[0]);body.removeMember("id");body.removeMember("hasEmailPassword");
 for(const auto& key:input.getMemberNames())if(key!="emailPassword"&&key!="clearEmailPassword")body[key]=input[key];
 if(!valid(body))co_return fail("validation_error","Check profile fields, rates, IDs and email settings.");
 if(!body["defaultCurrencyId"].isNull()){
  const std::string currency=body["defaultCurrencyId"].asString();
  auto rows=co_await db->execSqlCoro("SELECT id FROM core_currencies WHERE id=$1 AND is_deleted=false AND is_active=true FOR UPDATE",currency);
  if(rows.empty())co_return fail("validation_error","Select an active currency.");
 }
 std::string mode="keep",cipher;
 if(input.get("clearEmailPassword",false).asBool())mode="clear";
 if(input.isMember("emailPassword")&&!input["emailPassword"].asString().empty()){mode="replace";cipher=utils::company_profile_secret::seal(input["emailPassword"].asString(),who.tenantId);}
 const std::string payload=Json::FastWriter().write(body);
 std::string sql;
 if(op=="create"){
  std::string columns="tenant_id,created_by_user_id,email_password_encrypted",values="$1::uuid,$2::uuid,NULLIF($5,'')";
  for(const auto& f:fields){columns+=","+std::string(f.column);values+=",($3::jsonb->>'"+std::string(f.name)+"')::"+f.sqlType;}
  // $4 is an internal mode string; retain a typed use for stable parameter numbering.
  sql="INSERT INTO core_company_profiles ("+columns+") SELECT "+values+" WHERE $4::text IS NOT NULL RETURNING "+publicSelect();
 }else{
  sql="UPDATE core_company_profiles SET last_modified_at=now(),last_modified_by_user_id=$2,email_password_encrypted=CASE WHEN $4='keep' THEN email_password_encrypted WHEN $4='clear' THEN NULL ELSE $5 END";
  for(const auto& f:fields)sql+=","+std::string(f.column)+"=($3::jsonb->>'"+f.name+"')::"+f.sqlType;
  sql+=" WHERE tenant_id=$1 AND is_deleted=false RETURNING "+publicSelect();
 }
 auto rows=co_await db->execSqlCoro(sql,who.tenantId,who.userId,payload,mode,cipher);
 dto::BaseApiResponse result;result.success=true;result.result=decode(rows[0]);co_return result;
}
}
drogon::Task<dto::BaseApiResponse> CompanyProfileService::execute(std::string op,Json::Value body,utils::AuditIdentity who){
 if(!uuid(who.tenantId)||!uuid(who.userId))co_return fail("unauthorized","Tenant authentication required.");
 if(op=="delete")co_return fail("forbidden","Company profiles cannot be deleted.");
 if(op!="get"&&op!="create"&&op!="update")co_return fail("validation_error","Invalid operation.");
 if(op!="get"){
  if(!body.isObject())co_return fail("validation_error","A profile object is required.");
  for(const auto& key:body.getMemberNames())if(!known(key))co_return fail("validation_error","Unexpected profile field.");
  if(body.isMember("defaultCurrenyId")){if(body.isMember("defaultCurrencyId"))co_return fail("validation_error","Specify one currency field.");body["defaultCurrencyId"]=body["defaultCurrenyId"];body.removeMember("defaultCurrenyId");}
  if(body.isMember("clearEmailPassword")&&!body["clearEmailPassword"].isBool())co_return fail("validation_error","Invalid password action.");
  if(body.isMember("emailPassword")&&(!body["emailPassword"].isString()||body["emailPassword"].asString().size()>1024||body["emailPassword"].asString().find('\0')!=std::string::npos))co_return fail("validation_error","Invalid email password.");
  if(body.get("clearEmailPassword",false).asBool()&&!body.get("emailPassword","").asString().empty())co_return fail("validation_error","Cannot replace and clear the password together.");
 }
 try{
  auto db=drogon::app().getDbClient();if(op=="get")co_return co_await run(db,op,body,who);
  auto tx=co_await db->newTransactionCoro();auto result=co_await run(tx,op,body,who);
  if(!result.success){tx->rollback();co_return result;}
  if(!(co_await utils::CommitTransaction{std::move(tx)}))co_return fail("database_error","Unable to commit company profile.");co_return result;
 }catch(const UniqueViolation&){co_return fail("conflict","This tenant already has a company profile.");}
 catch(const std::exception&){co_return fail("database_error","Company profile service unavailable; check service configuration.");}
}
}
