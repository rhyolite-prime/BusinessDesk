// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport seam.
#include "domain_services/shared/BankService.h"
#include <drogon/orm/CoroMapper.h>
#include <cassert>
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
using business_desk::domain_services::BankService;
using business_desk::utils::AuditIdentity;
const std::string tenant="10000000-0000-4000-8000-000000000001", other="10000000-0000-4000-8000-000000000002", actor="20000000-0000-4000-8000-000000000001", actor2="20000000-0000-4000-8000-000000000002";
int checks=0;
void check(bool value,const char* label){if(!value)throw std::runtime_error(label);++checks;}
int main(){
 auto* db=PQconnectdb(std::getenv("BANK_TEST_DATABASE_URL"));assert(PQstatus(db)==0);
 auto sql=[&](const std::string& query,const std::vector<Json::Value>& params=std::vector<Json::Value>{}) {
  std::vector<std::string> strings;for(const auto& p:params)strings.push_back(p.isString()?p.asString():p.toStyledString());
  std::vector<const char*> values;for(const auto& s:strings)values.push_back(s.c_str());
  auto* result=PQexecParams(db,query.c_str(),values.size(),nullptr,values.data(),nullptr,nullptr,0);
  auto status=PQresultStatus(result);
  if(status!=1&&status!=2){std::string error=PQresultErrorMessage(result);const char* code=PQresultErrorField(result,'C');bool unique=code&&std::string(code)=="23505";PQclear(result);if(unique)throw drogon::orm::UniqueViolation(error);throw std::runtime_error(error);}
  drogon::TestResult rows;
  for(int row=0;row<PQntuples(result);++row){Json::Value value;for(int col=0;col<PQnfields(result);++col){const char* k=PQfname(result,col);if(PQgetisnull(result,row,col))value[k]=Json::nullValue;else if(PQftype(result,col)==20)value[k]=Json::Int64(std::stoll(PQgetvalue(result,row,col)));else if(PQftype(result,col)==16)value[k]=std::string(PQgetvalue(result,row,col))=="t";else value[k]=PQgetvalue(result,row,col);}rows.push_back({value});}PQclear(result);return rows;
 };
 // Dedicated disposable database/schema only. Setup uses individual statements for execParams.
 sql("DROP SCHEMA IF EXISTS bank_service_test CASCADE");sql("CREATE SCHEMA bank_service_test");sql("SET search_path TO bank_service_test");
 sql("CREATE TABLE tenants(id uuid PRIMARY KEY)");sql("CREATE TABLE users(id uuid PRIMARY KEY)");
 std::ifstream migration("database/migrations/005_banks_and_branches.sql");std::stringstream source;source<<migration.rdbuf();std::stringstream statements(source.str());std::string statement;while(std::getline(statements,statement,';'))if(statement.find_first_not_of(" \n\r\t")!=std::string::npos)sql(statement);
 sql("INSERT INTO tenants VALUES($1),($2)",{tenant,other});sql("INSERT INTO users VALUES($1),($2)",{actor,actor2});
 drogon::app().getDbClient()->execute=sql;
 Json::Value body;body["name"]=" Test Bank ";body["bankCode"]=" TST ";body["contactPerson"]="Contact";body["contactNo"]="+233 20 000 0000";body["email"]="bank@example.test";
 auto call=[&](std::string op,bool branch=false,std::string bankId="",std::string id="",Json::Value input=Json::Value{},AuditIdentity who=AuditIdentity{tenant,actor},int page=1,int size=20,std::string query=""){return BankService::execute(op,branch,bankId,id,input,page,size,query,who).get();};
 auto r=call("create",false,"","",body);check(r.success,"bank create");auto id=r.result["id"].asString();check(r.result["name"]=="Test Bank"&&r.result["bankCode"]=="TST","trim bank fields");
 check(sql("SELECT * FROM core_banks WHERE id=$1",{id})[0].value["created_by_user_id"]==actor,"create audit identity");
 check(!call("list",false,"","",{},{}).success,"missing identity denied");
 for(auto op:{"get","update","delete"}){r=call(op,false,"",id,body,{other,actor2});check(!r.success&&r.error["code"]=="not_found","foreign tenant bank hidden");}
 r=call("list",false,"","",{},{other,actor2});check(r.success&&r.result["totalCount"]==0,"foreign bank absent from list");
 auto duplicate=body;duplicate["bankCode"]="tst";r=call("create",false,"","",duplicate);check(!r.success&&r.error["code"]=="conflict","case-insensitive live code uniqueness");
 r=call("create",false,"","",body,{other,actor2});check(r.success,"same code allowed across tenants");
 for(auto field:{"tenantId","createdByUserId","isDeleted","bankBranches","id"}){auto invalid=body;invalid[field]="forged";r=call("create",false,"","",invalid);check(!r.success&&r.error["code"]=="validation_error","reject scope/audit fields");}
 for(auto field:{"name","bankCode"}){auto invalid=body;invalid[field]=" ";check(!call("create",false,"","",invalid).success,"required header fields");}
 for(auto field:{"name","contactPerson","bankCode","contactNo","email"}){auto invalid=body;invalid[field]=std::string(255,'x');check(!call("create",false,"","",invalid).success,"field size limit");}
 auto invalid=body;invalid["email"]="bad@";check(!call("create",false,"","",invalid).success,"invalid email rejected");
 invalid=body;invalid["contactNo"]=123;check(!call("create",false,"","",invalid).success,"non-string rejected");
 check(!call("get",false,"","invalid").success,"invalid UUID rejected");
 check(!call("list",false,"","",{},{tenant,actor},0).success,"invalid page rejected");
 check(!call("list",false,"","",{},{tenant,actor},1,201).success,"oversized page rejected");
 r=call("list",false,"","",{},{tenant,actor},1,20,"tst");check(r.success&&r.result["totalCount"]==1,"case-insensitive bank search");
 r=call("list",false,"","",{},{tenant,actor},1,20,"' OR true --");check(r.success&&r.result["totalCount"]==0,"bound search resists SQL injection");
 Json::Value child;child["name"]=" Accra ";child["email"]="branch@example.test";
 r=call("create",true,id,"",child);check(r.success,"branch create");auto branchId=r.result["id"].asString();check(r.result["bankId"]==id&&r.result["name"]=="Accra"&&r.result["contactNo"]=="","branch model and optional contacts");
 for(auto op:{"list","get","create","update","delete"}){r=call(op,true,id,branchId,child,{other,actor2});check(!r.success&&r.error["code"]=="not_found","foreign parent isolates every branch operation");}
 body["bankCode"]="OTHER";auto second=call("create",false,"","",body).result["id"].asString();
 for(auto op:{"get","update","delete"}){r=call(op,true,second,branchId,child);check(!r.success&&r.error["code"]=="not_found","branch cannot be accessed under wrong bank");}
 child["bankId"]=second;check(!call("update",true,id,branchId,child).success,"branch cannot be moved with client parent override");child.removeMember("bankId");
 child["name"]="Tema";r=call("update",true,id,branchId,child,{tenant,actor2});check(r.success&&r.result["name"]=="Tema","branch update");
 check(sql("SELECT * FROM core_bank_branches WHERE id=$1",{branchId})[0].value["last_modified_by_user_id"]==actor2,"branch modification audit");
 r=call("list",true,id,"",{},{tenant,actor},1,20,"tema");check(r.success&&r.result["totalCount"]==1,"branch search");
 r=call("delete",true,id,branchId,{}, {tenant,actor2});check(r.success,"branch delete");check(!call("get",true,id,branchId).success,"deleted branch hidden");check(!call("update",true,id,branchId,child).success,"deleted branch cannot be edited");
 check(sql("SELECT * FROM core_bank_branches WHERE id=$1",{branchId})[0].value["deleted_by_user_id"]==actor2,"branch deletion audit");
 auto liveChild=call("create",true,id,"",child).result["id"].asString();
 body["bankCode"]="NEW";body["name"]="Renamed";r=call("update",false,"",id,body,{tenant,actor2});check(r.success&&r.result["name"]=="Renamed","bank update");
 // A forced trigger failure must roll back the header/child delete transaction.
 sql("CREATE FUNCTION reject_bank_delete() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN IF NEW.is_deleted THEN RAISE EXCEPTION ''forced rollback''; END IF; RETURN NEW; END'");sql("CREATE TRIGGER fail_delete BEFORE UPDATE ON core_banks FOR EACH ROW EXECUTE FUNCTION reject_bank_delete()");
 r=call("delete",false,"",id);check(!r.success,"database error reported");
 check(call("get",false,"",id).success&&call("get",true,id,liveChild).success,"bank/child deletion is atomic on failure");sql("DROP TRIGGER fail_delete ON core_banks");
 r=call("delete",false,"",id,{}, {tenant,actor2});check(r.success,"bank delete");check(!call("get",false,"",id).success,"deleted bank hidden");check(!call("update",false,"",id,body).success,"deleted bank cannot be modified");check(!call("create",true,id,"",child).success,"cannot create branch under deleted parent");
 auto deleted=sql("SELECT * FROM core_bank_branches WHERE id=$1",{liveChild})[0].value;check(deleted["is_deleted"].asBool()&&deleted["deleted_by_user_id"]==actor2,"bank deletion cascades audited soft deletion");
 check(call("create",false,"","",body).success,"deleted bank code can be reused");
 drogon::TestTransaction::failCommit=true;
 body["bankCode"]="FAIL";r=call("create",false,"","",body);check(!r.success&&r.error["code"]=="database_error","commit failure is reported");
 drogon::TestTransaction::failCommit=false;
 check(sql("SELECT count(*) AS total FROM core_banks WHERE tenant_id=$1 AND bank_code=$2",{tenant,"FAIL"})[0].value["total"]==0,"failed commit does not persist a bank");
 // Down migration also succeeds on PostgreSQL.
 std::ifstream down("database/migrations/005_banks_and_branches.down.sql");std::stringstream downSource;downSource<<down.rdbuf();std::stringstream downStatements(downSource.str());while(std::getline(downStatements,statement,';'))if(statement.find_first_not_of(" \n\r\t")!=std::string::npos)sql(statement);
 sql("DROP SCHEMA bank_service_test CASCADE");drogon::app().getDbClient()->execute={};PQfinish(db);
 std::cout<<checks<<" bank service PostgreSQL checks passed\n";
}
