#include "CostCenterService.h"
#include "utils/TransactionUtil.h"
#include <regex>
namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
dto::BaseApiResponse fail(const char* code,const char* message){dto::BaseApiResponse r;r.error["code"]=code;r.error["message"]=message;return r;}
bool uuid(const std::string& s){static const std::regex p("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");return std::regex_match(s,p);}
bool validate(Json::Value& b){
 if(!b.isObject()||!b["name"].isString())return false;
 for(const auto& key:b.getMemberNames())if(key!="name"&&key!="parentId")return false;
 auto name=b["name"].asString();auto a=name.find_first_not_of(" \t\r\n"),z=name.find_last_not_of(" \t\r\n");
 if(a==std::string::npos)return false;name=name.substr(a,z-a+1);
 if(name.size()>160||name.find('\0')!=std::string::npos)return false;b["name"]=name;
 if(!b.isMember("parentId")||b["parentId"].isNull()){b["parentId"]=Json::nullValue;return true;}
 if(!b["parentId"].isString())return false;
 const auto parent=b["parentId"].asString();
 if(parent.empty()||parent=="00000000-0000-0000-0000-000000000000"){b["parentId"]=Json::nullValue;return true;}
 return uuid(parent);
}
Json::Value record(const Row& row){Json::Value r;r["id"]=row["id"].as<std::string>();r["name"]=row["name"].as<std::string>();const auto parent=row["parent_id"].as<std::string>();r["parentId"]=parent.empty()?Json::Value{}:Json::Value(parent);return r;}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db,std::string op,std::string id,Json::Value body,utils::AuditIdentity who){
 const bool write=op!="list"&&op!="get";
 if(write){
  // Serialize all hierarchy mutations for this tenant: cycle checks and leaf
  // deletion stay valid even when a different row is concurrently reparented.
  auto tenants=co_await db->execSqlCoro("SELECT id FROM tenants WHERE id=$1 AND is_deleted=false FOR UPDATE",who.tenantId);
  if(tenants.empty())co_return fail("not_found","Tenant not available.");
 }
 dto::BaseApiResponse r;
 if(op=="list"){
  auto rows=co_await db->execSqlCoro("SELECT * FROM core_cost_centers WHERE tenant_id=$1 AND is_deleted=false ORDER BY lower(name),id",who.tenantId);
  r.result["data"]=Json::arrayValue;for(const auto& row:rows)r.result["data"].append(record(row));r.result["totalCount"]=Json::UInt64(rows.size());
 }else{
  if(op!="create"){
   const std::string sql="SELECT * FROM core_cost_centers WHERE tenant_id=$1 AND id=$2 AND is_deleted=false"+std::string(write?" FOR UPDATE":"");
   auto rows=co_await db->execSqlCoro(sql,who.tenantId,id);
   if(rows.empty())co_return fail("not_found","Cost center not found.");
   if(op=="get"){r.success=true;r.result=record(rows[0]);co_return r;}
  }
  if(op=="delete"){
   auto children=co_await db->execSqlCoro("SELECT id FROM core_cost_centers WHERE tenant_id=$1 AND parent_id=$2 AND is_deleted=false LIMIT 1",who.tenantId,id);
   if(!children.empty())co_return fail("conflict","Move or delete children first.");
   auto references=co_await db->execSqlCoro("SELECT id FROM gl_account_balances WHERE tenant_id=$1 AND cost_center_id=$2 UNION ALL SELECT id FROM gl_budgets WHERE tenant_id=$1 AND cost_center_id=$2 AND is_deleted=false UNION ALL SELECT id FROM gl_journal_lines WHERE tenant_id=$1 AND cost_center_id=$2 AND is_deleted=false UNION ALL SELECT l.id FROM gl_cash_receipt_lines l JOIN gl_cash_receipts h ON h.id=l.cash_receipt_id AND h.tenant_id=l.tenant_id WHERE l.tenant_id=$1 AND l.cost_center_id=$2 AND h.is_deleted=false LIMIT 1",who.tenantId,id);
   if(!references.empty())co_return fail("conflict","Financial references prevent deletion.");
   co_await db->execSqlCoro("UPDATE core_cost_centers SET is_deleted=true,deleted_at=now(),deleted_by_user_id=$3,last_modified_at=now(),last_modified_by_user_id=$3 WHERE tenant_id=$1 AND id=$2 AND is_deleted=false",who.tenantId,id,who.userId);
   r.result["id"]=id;r.result["isDeleted"]=true;
  }else{
   const std::string parent=body["parentId"].isNull()?std::string{}:body["parentId"].asString();
   const std::string name=body["name"].asString();
   if(!parent.empty()){
    auto parents=co_await db->execSqlCoro("SELECT id FROM core_cost_centers WHERE tenant_id=$1 AND id=$2 AND is_deleted=false",who.tenantId,parent);
    if(parents.empty())co_return fail("validation_error","Choose a live parent in this tenant.");
    // UNION (not UNION ALL) terminates safely even if legacy data is corrupt.
    auto cycle=co_await db->execSqlCoro("WITH RECURSIVE ancestors AS (SELECT id,parent_id FROM core_cost_centers WHERE tenant_id=$1 AND id=$2 AND is_deleted=false UNION SELECT n.id,n.parent_id FROM core_cost_centers n JOIN ancestors a ON n.id=a.parent_id WHERE n.tenant_id=$1 AND n.is_deleted=false) SELECT id FROM ancestors WHERE id=NULLIF($3,'')::uuid",who.tenantId,parent,id);
    if(!cycle.empty())co_return fail("validation_error","A cost center cannot be its own ancestor.");
   }
   if(op=="create"){
    auto rows=co_await db->execSqlCoro("INSERT INTO core_cost_centers (tenant_id,parent_id,name,created_by_user_id) VALUES ($1,NULLIF($2,'')::uuid,$3,$4) RETURNING *",who.tenantId,parent,name,who.userId);r.result=record(rows[0]);
   }else{
    auto rows=co_await db->execSqlCoro("UPDATE core_cost_centers SET parent_id=NULLIF($3,'')::uuid,name=$4,last_modified_at=now(),last_modified_by_user_id=$5 WHERE tenant_id=$1 AND id=$2 AND is_deleted=false RETURNING *",who.tenantId,id,parent,name,who.userId);r.result=record(rows[0]);
   }
  }
 }
 r.success=true;co_return r;
}
}
drogon::Task<dto::BaseApiResponse> CostCenterService::execute(std::string op,std::string id,Json::Value body,utils::AuditIdentity who){
 if(!uuid(who.tenantId)||!uuid(who.userId))co_return fail("unauthorized","Tenant authentication required.");
 if(op!="list"&&op!="get"&&op!="create"&&op!="update"&&op!="delete")co_return fail("validation_error","Invalid operation.");
 if(op!="list"&&op!="create"&&!uuid(id))co_return fail("validation_error","Invalid cost center ID.");
 if((op=="create"||op=="update")&&!validate(body))co_return fail("validation_error","Enter a name and valid parent.");
 try{
  auto db=drogon::app().getDbClient();
  if(op=="list"||op=="get")co_return co_await run(db,op,id,body,who);
  auto tx=co_await db->newTransactionCoro();auto result=co_await run(tx,op,id,body,who);
  if(!result.success){tx->rollback();co_return result;}
  if(!(co_await utils::CommitTransaction{std::move(tx)}))co_return fail("database_error","Unable to commit cost center changes.");co_return result;
 }catch(const UniqueViolation&){co_return fail("conflict","A sibling already has this name.");}
 catch(const std::exception&){co_return fail("database_error","Cost center service unavailable.");}
}
}
