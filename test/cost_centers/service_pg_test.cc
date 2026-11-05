// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport seam.
#include "domain_services/shared/CostCenterService.h"
#include <drogon/orm/CoroMapper.h>
#include <cassert>
#include <algorithm>
#include <cctype>
#include <fstream>
#include <iostream>
#include <sstream>
// Stable libpq C ABI subset: avoids requiring distro libpq development headers.
extern "C" {
struct pg_conn; struct pg_result;
pg_conn* PQconnectdb(const char*); void PQfinish(pg_conn*); int PQstatus(const pg_conn*);
pg_result* PQexecParams(pg_conn*,const char*,int,const unsigned int*,const char*const*,const int*,const int*,int);
int PQresultStatus(const pg_result*); char* PQresultErrorMessage(const pg_result*); char* PQresultErrorField(const pg_result*,int);
int PQntuples(const pg_result*); int PQnfields(const pg_result*); char* PQfname(const pg_result*,int);
char* PQgetvalue(const pg_result*,int,int); int PQgetisnull(const pg_result*,int,int); unsigned int PQftype(const pg_result*,int);
void PQclear(pg_result*);
}
using business_desk::domain_services::CostCenterService;
using business_desk::utils::AuditIdentity;
const std::string tenant="10000000-0000-4000-8000-000000000001", other="10000000-0000-4000-8000-000000000002", actor="20000000-0000-4000-8000-000000000001", actor2="20000000-0000-4000-8000-000000000002";
int checks=0;
void check(bool value,const char* label){if(!value)throw std::runtime_error(label);++checks;}
int main(){
 auto* db=PQconnectdb(std::getenv("COST_CENTER_TEST_DATABASE_URL"));assert(PQstatus(db)==0);
 auto sql=[&](const std::string& query,const std::vector<Json::Value>& params=std::vector<Json::Value>{}) {
  std::vector<std::string> strings;for(const auto& p:params)strings.push_back(p.isString()?p.asString():p.toStyledString());
  const auto widths=std::exchange(drogon::testParameterWidths,{});
  std::vector<int> lengths(params.size(),0),formats(params.size(),0);
  for(size_t i=0;i<params.size()&&i<widths.size();++i) if(widths[i]) {
   lengths[i]=widths[i];formats[i]=1;strings[i].resize(widths[i]);
   const auto number=params[i].asInt64();
   for(int byte=0;byte<widths[i];++byte) strings[i][byte]=static_cast<char>((static_cast<uint64_t>(number)>>(8*(widths[i]-1-byte)))&255);
  }
  std::vector<const char*> values;for(const auto& s:strings)values.push_back(s.c_str());
  auto* result=PQexecParams(db,query.c_str(),values.size(),nullptr,values.data(),lengths.data(),formats.data(),0);
  auto status=PQresultStatus(result);
  if(status!=1&&status!=2){std::string error=PQresultErrorMessage(result);const char* code=PQresultErrorField(result,'C');bool unique=code&&std::string(code)=="23505";PQclear(result);if(unique)throw drogon::orm::UniqueViolation(error);throw std::runtime_error(error);}
  drogon::TestResult rows;
  for(int row=0;row<PQntuples(result);++row){Json::Value value;for(int col=0;col<PQnfields(result);++col){const char* k=PQfname(result,col);if(PQgetisnull(result,row,col))value[k]=Json::nullValue;else if((PQftype(result,col)==20||PQftype(result,col)==23||PQftype(result,col)==21))value[k]=Json::Int64(std::stoll(PQgetvalue(result,row,col)));else if(PQftype(result,col)==16)value[k]=std::string(PQgetvalue(result,row,col))=="t";else value[k]=PQgetvalue(result,row,col);}rows.push_back({value});}PQclear(result);return rows;
 };
 // Dedicated disposable database/schema only. Setup uses individual statements for execParams.
 sql("DROP SCHEMA IF EXISTS cost_center_test CASCADE");sql("CREATE SCHEMA cost_center_test");sql("SET search_path TO cost_center_test");
 sql("CREATE TABLE tenants(id uuid PRIMARY KEY,is_deleted boolean NOT NULL DEFAULT false)");sql("CREATE TABLE users(id uuid PRIMARY KEY,is_deleted boolean DEFAULT false,is_active boolean DEFAULT true,is_locked_out boolean DEFAULT false,is_host_admin_user boolean DEFAULT false)");
 std::ifstream migration("database/migrations/007_cost_centers.sql");std::stringstream source;source<<migration.rdbuf();std::stringstream statements(source.str());std::string statement;while(std::getline(statements,statement,';'))if(statement.find_first_not_of(" \n\r\t")!=std::string::npos)sql(statement);
 sql("INSERT INTO tenants(id) VALUES($1),($2)",{tenant,other});sql("INSERT INTO users(id) VALUES($1),($2)",{actor,actor2});
 for(const auto& table:{"gl_account_balances","gl_budgets","gl_journal_lines"})sql("CREATE TABLE "+std::string(table)+"(id uuid DEFAULT gen_random_uuid(),tenant_id uuid,cost_center_id uuid"+std::string(std::string(table)=="gl_account_balances"?"":",is_deleted boolean DEFAULT false")+")");
 sql("CREATE TABLE gl_cash_receipts(id uuid PRIMARY KEY,tenant_id uuid,is_deleted boolean DEFAULT false)");sql("CREATE TABLE gl_cash_receipt_lines(id uuid DEFAULT gen_random_uuid(),tenant_id uuid,cost_center_id uuid,cash_receipt_id uuid)");
 bool lockVerified=false;
 drogon::app().getDbClient()->execute=[&](const std::string& query,const std::vector<Json::Value>& params){
  auto result=sql(query,params);
  if(!lockVerified&&query.find("SELECT id FROM tenants")!=std::string::npos){
   auto* competing=PQconnectdb(std::getenv("COST_CENTER_TEST_DATABASE_URL"));assert(PQstatus(competing)==0);
   const char* value=tenant.c_str();auto* locked=PQexecParams(competing,"SELECT id FROM cost_center_test.tenants WHERE id=$1 FOR UPDATE NOWAIT",1,nullptr,&value,nullptr,nullptr,0);
   const char* code=PQresultErrorField(locked,'C');check(code&&std::string(code)=="55P03","tenant hierarchy lock excludes concurrent writers");PQclear(locked);PQfinish(competing);lockVerified=true;
  }
  return result;
 };
 auto input=[](std::string name,std::string parent=""){Json::Value b;b["name"]=name;b["parentId"]=parent.empty()?Json::Value{}:Json::Value(parent);return b;};
 auto call=[&](std::string op,std::string id="",Json::Value body=Json::Value{},AuditIdentity who=AuditIdentity{tenant,actor}){return CostCenterService::execute(op,id,body,who).get();};
 auto r=call("create","",input(" Operations "));check(r.success,"root create");auto root=r.result["id"].asString();check(r.result["name"]=="Operations"&&r.result["parentId"].isNull(),"trim name and null root");
 check(sql("SELECT * FROM core_cost_centers WHERE id=$1",{root})[0].value["created_by_user_id"]==actor,"creation audit");
 check(!call("list","",{},{}).success,"anonymous denied");check(!call("list","",{},{"",actor}).success,"host without tenant denied");
 for(auto op:{"get","update","delete"}){r=call(op,root,input("Foreign"),{other,actor2});check(!r.success&&r.error["code"]=="not_found","foreign tenant row hidden");}
 check(call("list","",{},{other,actor2}).result["data"].empty(),"list tenant isolated");
 check(!call("create","",input("Child",root),{other,actor2}).success,"cross-tenant parent rejected");
 auto child=call("create","",input("Finance",root)).result["id"].asString();auto grand=call("create","",input("Payroll",child)).result["id"].asString();
 check(!child.empty()&&!grand.empty(),"multilevel create");
 r=call("list");check(r.success&&r.result["data"].size()==3,"full hierarchy returned without page gaps");
 r=call("delete",root);check(!r.success&&r.error["code"]=="conflict","live children block deletion");
 check(!call("update",root,input("Self",root)).success,"self parent rejected");
 auto upperRoot=root;std::transform(upperRoot.begin(),upperRoot.end(),upperRoot.begin(),[](unsigned char c){return std::toupper(c);});
 check(!call("update",upperRoot,input("Cycle",grand)).success,"uppercase UUID cannot bypass cycle validation");
 check(!call("update",root,input("Cycle",grand)).success,"descendant parent rejected");
 check(!call("update",child,input("Cycle",grand)).success,"direct cycle rejected");
 check(call("get",root).result["name"]=="Operations","failed hierarchy writes leave root unchanged");
 r=call("create","",input("operations"));check(!r.success&&r.error["code"]=="conflict","case insensitive root uniqueness");
 r=call("create","",input("finance",root));check(!r.success&&r.error["code"]=="conflict","case insensitive sibling uniqueness");
 auto second=call("create","",input("Sales")).result["id"].asString();auto sibling=call("create","",input("Finance",second));check(sibling.success,"same name allowed under different parents");check(call("delete",sibling.result["id"].asString()).success,"delete different-parent duplicate");
 check(call("create","",input("Operations"),{other,actor2}).success,"same root name allowed in another tenant");
 for(auto field:{"tenantId","createdByUserId","isDeleted","id","children"}){auto b=input("Bad");b[field]="forged";check(!call("create","",b).success,"scope/audit override rejected");}
 for(auto name:{"", " \t\n"})check(!call("create","",input(name)).success,"blank name rejected");
 check(!call("create","",input(std::string(161,'x'))).success,"name length");
 auto bad=input("Bad");bad["name"]=10;check(!call("create","",bad).success,"nonstring name");bad=input("Bad");bad["parentId"]=10;check(!call("create","",bad).success,"nonstring parent");
 check(!call("create","",input("Bad","invalid")).success,"invalid parent UUID");
 check(!call("create","",input("Bad","90000000-0000-4000-8000-000000000009")).success,"missing parent rejected");
 check(!call("get","invalid").success,"invalid record UUID");
 check(call("create","",input("Guid root","00000000-0000-0000-0000-000000000000")).result["parentId"].isNull(),"Guid.Empty normalized to root");
 r=call("update",child,input("Finance",second),{tenant,actor2});check(r.success&&r.result["parentId"]==second,"subtree reparent");check(call("get",grand).result["parentId"]==child,"subtree descendants retain links");
 check(sql("SELECT * FROM core_cost_centers WHERE id=$1",{child})[0].value["last_modified_by_user_id"]==actor2,"update audit");
 drogon::TestTransaction::failCommit=true;r=call("update",child,input("Failed"));check(!r.success,"commit failure reported");drogon::TestTransaction::failCommit=false;check(call("get",child).result["name"]=="Finance","failed commit rolls back hierarchy update");
 check(call("delete",grand,{}, {tenant,actor2}).success,"leaf soft delete");check(!call("get",grand).success&&!call("update",grand,input("Gone")).success,"deleted rows cannot be read or changed");
 check(!call("create","",input("Invalid parent",grand)).success,"deleted parent rejected");
 check(sql("SELECT * FROM core_cost_centers WHERE id=$1",{grand})[0].value["deleted_by_user_id"]==actor2,"delete audit");
 check(call("delete",child).success,"deleted children no longer block parent deletion");
 check(call("create","",input("Finance",second)).success,"deleted sibling names reusable");
 auto injection=call("create","",input("A'); DROP TABLE tenants; --"));check(injection.success,"parameterized names");
 sql("UPDATE tenants SET is_deleted=true WHERE id=$1",{tenant});check(!call("create","",input("Dead tenant")).success,"deleted tenant mutation denied");
 sql("UPDATE tenants SET is_deleted=false WHERE id=$1",{tenant});
 for(const auto& table:{"gl_account_balances","gl_budgets","gl_journal_lines"}){
  const auto referenceId=call("create","",input(std::string(table))).result["id"].asString();
  sql("INSERT INTO "+std::string(table)+"(tenant_id,cost_center_id) VALUES($1,$2)",{tenant,referenceId});
  auto blocked=call("delete",referenceId);check(!blocked.success&&blocked.error["code"]=="conflict","live financial reference blocks deletion");
  if(std::string(table)!="gl_account_balances"){
   sql("UPDATE "+std::string(table)+" SET is_deleted=true");check(call("delete",referenceId).success,"soft deleted financial references ignored");
  }
  sql("DELETE FROM "+std::string(table));
 }
 sql("INSERT INTO gl_cash_receipts(id,tenant_id) VALUES($1,$2)",{actor,tenant});sql("INSERT INTO gl_cash_receipt_lines(tenant_id,cost_center_id,cash_receipt_id) VALUES($1,$2,$3)",{tenant,root,actor});
 check(!call("delete",root).success,"live cash receipt blocks delete");sql("UPDATE gl_cash_receipts SET is_deleted=true");check(call("delete",root).success,"deleted receipt no longer blocks delete");
 sql("DROP SCHEMA cost_center_test CASCADE");drogon::app().getDbClient()->execute={};PQfinish(db);
 std::cout<<checks<<" cost center PostgreSQL checks passed\n";
}
