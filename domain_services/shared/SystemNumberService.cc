#include "SystemNumberService.h"
#include "utils/TransactionUtil.h"
#include <regex>
#include <cstdint>
namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
dto::BaseApiResponse fail(const char* code,const char* message){dto::BaseApiResponse r;r.error["code"]=code;r.error["message"]=message;return r;}
bool uuid(const std::string& s){static const std::regex pattern("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");return std::regex_match(s,pattern);}
std::string trim(std::string s){auto a=s.find_first_not_of(" \t\r\n"),b=s.find_last_not_of(" \t\r\n");return a==std::string::npos?"":s.substr(a,b-a+1);}
bool validate(Json::Value& b){
 if(!b.isObject()||b.size()!=8)return false;
 for(const auto& key:b.getMemberNames())if(key!="moduleId"&&key!="itemName"&&key!="key"&&key!="prefix"&&key!="suffix"&&key!="formatPattern"&&key!="padding"&&key!="lastNo")return false;
 for(const auto& key:{"moduleId","padding","lastNo"})if(!b[key].isInt()||b[key].asInt()<0)return false;
 if(b["padding"].asInt()>18)return false;
 for(const auto& key:{"itemName","key","prefix","suffix","formatPattern"}){
  if(!b[key].isString())return false;
  auto s=b[key].asString();if(std::string(key)!="prefix"&&std::string(key)!="suffix")s=trim(s);
  if(s.size()>(std::string(key)=="formatPattern"?50:100)||s.find('\0')!=std::string::npos)return false;
  if((std::string(key)=="itemName"||std::string(key)=="key")&&s.empty())return false;b[key]=s;
 }
 auto pattern=b["formatPattern"].asString();const auto number=pattern.find("{NO}");
 if(number==std::string::npos||pattern.find("{NO}",number+4)!=std::string::npos)return false;
 for(const auto& token:{"{NO}","{PREFIX}","{SUFFIX}"}){size_t pos;while((pos=pattern.find(token))!=std::string::npos)pattern.erase(pos,std::string(token).size());}
 return pattern.find_first_of("{}") == std::string::npos;
}
Json::Value record(const Row& row){
 Json::Value r;for(const auto& k:{"id","key","prefix","suffix"})r[k]=row[k].as<std::string>();
 r["itemName"]=row["item_name"].as<std::string>();r["formatPattern"]=row["format_pattern"].as<std::string>();
 r["moduleId"]=row["module_id"].as<int>();r["padding"]=row["padding"].as<int>();r["lastNo"]=row["last_no"].as<int>();return r;
}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db,std::string op,std::string id,Json::Value body,int page,int size,std::string query,utils::AuditIdentity who,bool host){
 if(host){
  auto admins=co_await db->execSqlCoro("SELECT id FROM users WHERE id=$1 AND is_deleted=false AND is_active=true AND is_locked_out=false AND is_host_admin_user=true",who.userId);
  if(admins.empty())co_return fail("forbidden","Host administrator required.");
 }
 // A UUID bind is retained in both SQL shapes; it never comes from client JSON.
 const std::string scope=host?"tenant_id IS NULL AND $1::uuid IS NOT NULL AND is_deleted=false":"tenant_id=$1::uuid AND is_deleted=false";
 const std::string scopeId=host?who.userId:who.tenantId;
 dto::BaseApiResponse r;
 if(op=="list"){
  const std::string search=" AND (strpos(lower(item_name),lower($2))>0 OR strpos(lower(key),lower($2))>0)";
  auto count=co_await db->execSqlCoro("SELECT count(*) AS total FROM core_system_numbers WHERE "+scope+search,scopeId,query);
  const int64_t limit=size,offset=(static_cast<int64_t>(page)-1)*limit;
  auto rows=co_await db->execSqlCoro("SELECT * FROM core_system_numbers WHERE "+scope+search+" ORDER BY module_id,lower(item_name),id LIMIT $3::bigint OFFSET $4::bigint",scopeId,query,limit,offset);
  r.result["data"]=Json::arrayValue;for(const auto& row:rows)r.result["data"].append(record(row));auto total=count[0]["total"].as<int64_t>();
  r.result["totalCount"]=Json::Int64(total);r.result["totalPages"]=Json::Int64((total+size-1)/size);r.result["pageNo"]=page;r.result["pageSize"]=size;
 }else if(op=="get"){
  auto rows=co_await db->execSqlCoro("SELECT * FROM core_system_numbers WHERE "+scope+" AND id=$2",scopeId,id);
  if(rows.empty())co_return fail("not_found","System number not found.");r.result=record(rows[0]);
 }else{
  if(op!="create"){
   auto rows=co_await db->execSqlCoro("SELECT id FROM core_system_numbers WHERE "+scope+" AND id=$2 FOR UPDATE",scopeId,id);
   if(rows.empty())co_return fail("not_found","System number not found.");
  }
  if(op=="delete"){
   co_await db->execSqlCoro("UPDATE core_system_numbers SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,last_modified_at=now(),last_modified_by_user_id=$3 WHERE "+scope+" AND id=$2",scopeId,id,who.userId);
   r.result["id"]=id;r.result["isDeleted"]=true;
  }else{
   // Bind numeric form fields through JSONB casts, avoiding binary integer-width inference.
   const std::string payload=Json::FastWriter().write(body);
   const std::string fields="module_id=($3::jsonb->>'moduleId')::integer,item_name=$3::jsonb->>'itemName',key=$3::jsonb->>'key',prefix=$3::jsonb->>'prefix',suffix=$3::jsonb->>'suffix',format_pattern=$3::jsonb->>'formatPattern',padding=($3::jsonb->>'padding')::integer,last_no=($3::jsonb->>'lastNo')::integer";
   if(op=="create"){
    auto rows=co_await db->execSqlCoro("INSERT INTO core_system_numbers (module_id,item_name,key,prefix,suffix,format_pattern,padding,last_no,created_by_user_id) SELECT ($1::jsonb->>'moduleId')::integer,$1::jsonb->>'itemName',$1::jsonb->>'key',$1::jsonb->>'prefix',$1::jsonb->>'suffix',$1::jsonb->>'formatPattern',($1::jsonb->>'padding')::integer,($1::jsonb->>'lastNo')::integer,$2::uuid RETURNING *",payload,who.userId);
    r.result=record(rows[0]);
   }else{
    auto rows=co_await db->execSqlCoro("UPDATE core_system_numbers SET "+fields+",last_modified_at=now(),last_modified_by_user_id=$4 WHERE "+scope+" AND id=$2 RETURNING *",scopeId,id,payload,who.userId);
    r.result=record(rows[0]);
   }
  }
 }
 r.success=true;co_return r;
}
}
drogon::Task<dto::BaseApiResponse> SystemNumberService::execute(std::string op,std::string id,Json::Value body,int page,int size,std::string query,utils::AuditIdentity who,bool host){
 if(!uuid(who.userId)||(host?who.hasTenant():!uuid(who.tenantId)))co_return fail("unauthorized","Authentication with the correct scope is required.");
 if(op!="list"&&op!="get"&&op!="create"&&op!="update"&&op!="delete")co_return fail("validation_error","Invalid operation.");
 if(!host&&(op=="create"||op=="delete"))co_return fail("forbidden","Tenant copies may only be edited.");
 if((op=="get"||op=="update"||op=="delete")&&!uuid(id))co_return fail("validation_error","Invalid ID.");
 if(page<1||page>1000000||size<1||size>200||query.size()>100)co_return fail("validation_error","Invalid list parameters.");
 if((op=="create"||op=="update")&&!validate(body))co_return fail("validation_error","Check numbering fields and format tokens.");
 try{
  auto db=drogon::app().getDbClient();
  if(op=="list"||op=="get")co_return co_await run(db,op,id,body,page,size,query,who,host);
  auto tx=co_await db->newTransactionCoro();auto result=co_await run(tx,op,id,body,page,size,query,who,host);
  if(!result.success){tx->rollback();co_return result;}
  if(!(co_await utils::CommitTransaction{std::move(tx)}))co_return fail("database_error","Unable to commit numbering changes.");co_return result;
 }catch(const UniqueViolation&){co_return fail("conflict","Module and key already exist in this scope.");}
 catch(const std::exception&){co_return fail("database_error","System number service unavailable.");}
}
}
