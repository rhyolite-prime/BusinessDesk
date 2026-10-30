// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport seam.
#include "domain_services/shared/SystemNumberService.h"
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
using business_desk::domain_services::SystemNumberService;
using business_desk::utils::AuditIdentity;
const std::string tenant="10000000-0000-4000-8000-000000000001", other="10000000-0000-4000-8000-000000000002", actor="20000000-0000-4000-8000-000000000001", actor2="20000000-0000-4000-8000-000000000002";
int checks=0;
void check(bool value,const char* label){if(!value)throw std::runtime_error(label);++checks;}
int main(){
 auto* db=PQconnectdb(std::getenv("SYSTEM_NUMBER_TEST_DATABASE_URL"));assert(PQstatus(db)==0);
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
 sql("DROP SCHEMA IF EXISTS system_number_test CASCADE");sql("CREATE SCHEMA system_number_test");sql("SET search_path TO system_number_test");
 sql("CREATE TABLE tenants(id uuid PRIMARY KEY,is_deleted boolean DEFAULT false)");sql("CREATE TABLE users(id uuid PRIMARY KEY,is_deleted boolean DEFAULT false,is_active boolean DEFAULT true,is_locked_out boolean DEFAULT false,is_host_admin_user boolean DEFAULT false)");
 std::ifstream migration("database/migrations/006_system_numbers.sql");std::stringstream source;source<<migration.rdbuf();std::stringstream statements(source.str());std::string statement;while(std::getline(statements,statement,';'))if(statement.find_first_not_of(" \n\r\t")!=std::string::npos)sql(statement);
 sql("INSERT INTO tenants(id) VALUES($1),($2)",{tenant,other});sql("INSERT INTO users(id) VALUES($1),($2)",{actor,actor2});
 // Prove this test uses the real binary protocol, not a text-only approximation.
 drogon::testParameterWidths={4};bool reproduced=false;
 try {sql("SELECT 1 LIMIT $1",{20});} catch(const std::exception& e) {reproduced=std::string(e.what()).find("insufficient data left in message")!=std::string::npos;}
 check(reproduced,"reproduce original int32/bigint wire-format failure");
 drogon::app().getDbClient()->execute=sql;
 sql("UPDATE users SET is_host_admin_user=true WHERE id=$1",{actor});
 Json::Value body;body["moduleId"]=1;body["itemName"]=" Journal ";body["key"]=" JOURNAL ";body["prefix"]="JV-";body["suffix"]="/26";body["formatPattern"]="{PREFIX}{NO}{SUFFIX}";body["padding"]=5;body["lastNo"]=10;
 auto call=[&](std::string op,std::string id="",Json::Value input=Json::Value{},bool host=true,AuditIdentity who=AuditIdentity{"",actor},int page=1,int size=20,std::string query=""){return SystemNumberService::execute(op,id,input,page,size,query,who,host).get();};
 auto r=call("create","",body);check(r.success,"host creates template");auto id=r.result["id"].asString();check(r.result["itemName"]=="Journal"&&r.result["key"]=="JOURNAL","trim required fields");
 check(sql("SELECT * FROM core_system_numbers WHERE id=$1",{id})[0].value["created_by_user_id"]==actor,"host audit");
 check(!call("list","",{},true,{}).success,"anonymous denied");
 r=call("list","",{},true,{"",actor2});check(!r.success&&r.error["code"]=="forbidden","ordinary host denied");
 sql("UPDATE users SET is_locked_out=true WHERE id=$1",{actor});check(!call("list").success,"locked admin denied");sql("UPDATE users SET is_locked_out=false WHERE id=$1",{actor});
 check(!call("list","",{},true,{tenant,actor}).success,"tenant identity cannot use host scope");
 check(!call("list","",{},false,{"",actor}).success,"host identity cannot use tenant scope");
 r=call("list");check(r.success&&r.result["data"].size()==1,"binary pagination and host list");
 r=call("list","",{},true,{"",actor},2,1);check(r.success&&r.result["data"].empty()&&r.result["totalCount"]==1,"pagination offset");
 r=call("list","",{},true,{"",actor},1,20,"journal");check(r.success&&r.result["totalCount"]==1,"case-insensitive search");
 check(!call("create","",body).success,"duplicate key blocked");
 for(auto field:{"tenantId","sourceTemplateId","createdByUserId","isDeleted","id"}){auto bad=body;bad[field]="forged";check(!call("create","",bad).success,"reject scope or audit overrides");}
 for(auto field:{"itemName","key"}){auto bad=body;bad[field]=" ";check(!call("create","",bad).success,"required string");}
 for(auto field:{"itemName","key","prefix","suffix","formatPattern"}){auto bad=body;bad[field]=std::string(101,'x');check(!call("create","",bad).success,"max field length");}
 for(auto field:{"moduleId","padding","lastNo"}){auto bad=body;bad[field]=-1;check(!call("create","",bad).success,"nonnegative integers");bad[field]=1.5;check(!call("create","",bad).success,"fraction rejected");bad[field]="1";check(!call("create","",bad).success,"string integer rejected");}
 for(auto pattern:{"{PREFIX}","{NO}{NO}","{UNKNOWN}{NO}","{NO}{","{no}"}){auto bad=body;bad["formatPattern"]=pattern;check(!call("create","",bad).success,"invalid token pattern");}
 auto bad=body;bad["padding"]=19;check(!call("create","",bad).success,"padding limit");
 check(!call("get","bad-id").success,"UUID validation");
 check(!call("list","",{},true,{"",actor},0).success,"page validation");
 // Snapshot semantics; actual tenant-provisioning CTE is exercised by test/tenants/sql_test.mjs.
 const std::string copySql="INSERT INTO core_system_numbers (tenant_id,source_template_id,module_id,item_name,key,prefix,suffix,format_pattern,padding,last_no,created_by_user_id) SELECT $1,id,module_id,item_name,key,prefix,suffix,format_pattern,padding,last_no,$2 FROM core_system_numbers WHERE tenant_id IS NULL AND is_deleted=false RETURNING id";
 auto copy=sql(copySql,{tenant,actor})[0].value["id"].asString();
 auto otherCopy=sql(copySql,{other,actor})[0].value["id"].asString();
 r=call("get",copy,{},false,{tenant,actor2});check(r.success&&r.result["lastNo"]==10,"tenant reads snapshot");
 r=call("list","",{},false,{tenant,actor2});check(r.success&&r.result["totalCount"]==1,"tenant sees only own rows");
 for(auto op:{"get","update"}){r=call(op,otherCopy,body,false,{tenant,actor2});check(!r.success&&r.error["code"]=="not_found","cross-tenant access denied");}
 check(!call("get",id,{},false,{tenant,actor2}).success,"host template hidden from tenant");
 check(!call("get",copy).success,"host template CRUD does not target tenant copies");
 for(auto op:{"create","delete"}){r=call(op,copy,body,false,{tenant,actor2});check(!r.success&&r.error["code"]=="forbidden","tenant create/delete forbidden");}
 body["prefix"]="OWN-";body["lastNo"]=99;
 r=call("update",copy,body,false,{tenant,actor2});check(r.success&&r.result["prefix"]=="OWN-"&&r.result["lastNo"]==99,"tenant edits copy");
 check(sql("SELECT * FROM core_system_numbers WHERE id=$1",{copy})[0].value["last_modified_by_user_id"]==actor2,"tenant update audit");
 check(call("get",id).result["prefix"]=="JV-"&&call("get",otherCopy,{},false,{other,actor2}).result["prefix"]=="JV-","tenant edits isolated from host and other tenant");
 body["prefix"]="HOST-";check(call("update",id,body).success,"host updates template");
 check(call("get",copy,{},false,{tenant,actor2}).result["prefix"]=="OWN-","host update preserves tenant settings");
 drogon::TestTransaction::failCommit=true;body["prefix"]="FAIL-";r=call("update",id,body);check(!r.success,"commit failure reported");drogon::TestTransaction::failCommit=false;check(call("get",id).result["prefix"]=="HOST-","failed commit rolls back");
 Json::Value sync;sync["tenantId"]=tenant;sync["mode"]="override";sync["confirmation"]="SYNC";
 check(!call("sync","",sync,false,{tenant,actor2}).success,"tenant cannot sync");
 check(!call("sync","",sync,true,{"",actor2}).success,"ordinary host cannot sync");
 auto invalid=sync;invalid["confirmation"]="";check(!call("sync","",invalid).success,"confirmation required");
 invalid=sync;invalid["mode"]="unknown";check(!call("sync","",invalid).success,"invalid mode rejected");
 invalid=sync;invalid["tenantId"]="bad";check(!call("sync","",invalid).success,"invalid tenant rejected");
 sql("UPDATE tenants SET is_deleted=true WHERE id=$1",{tenant});check(!call("sync","",sync).success,"deleted tenant rejected");sql("UPDATE tenants SET is_deleted=false WHERE id=$1",{tenant});
 auto extra=body;extra["key"]="EXTRA";auto extraHost=call("create","",extra).result["id"].asString();
 sql("INSERT INTO core_system_numbers (tenant_id,source_template_id,module_id,item_name,key,prefix,suffix,format_pattern,padding,last_no,created_by_user_id) SELECT $1,id,module_id,item_name,'TENANT-ONLY',prefix,suffix,format_pattern,padding,last_no,$2 FROM core_system_numbers WHERE id=$3",{tenant,actor,extraHost});
 check(call("delete",extraHost).success,"archive extra host template");
 r=call("sync","",sync);check(r.success&&r.result["updated"]==1,"override existing key");
 check(call("get",copy,{},false,{tenant,actor2}).result["prefix"]=="HOST-","override values copied and ID preserved");
 check(call("list","",{},false,{tenant,actor2}).result["totalCount"]==2,"tenant-only keys retained");
 check(call("get",otherCopy,{},false,{other,actor2}).result["prefix"]=="JV-","sync isolates other tenant");
 sql("UPDATE core_system_numbers SET is_deleted=true WHERE id=$1",{copy});
 r=call("sync","",sync);check(r.success&&r.result["copied"]==1,"archived source restored");
 check(call("get",copy,{},false,{tenant,actor2}).success,"restored copy retains ID");
 // Selective sync must never affect nonselected entries or other tenants.
 auto selective=sync;selective["templateIds"]=Json::arrayValue;selective["templateIds"].append(id);
 sql("UPDATE core_system_numbers SET prefix='SELECTIVE-' WHERE id=$1",{id});
 r=call("sync","",selective);check(r.success&&r.result["updated"]==1,"selective template sync");
 check(call("get",copy,{},false,{tenant,actor2}).result["prefix"]=="SELECTIVE-","selected template updated");
 check(sql("SELECT prefix FROM core_system_numbers WHERE tenant_id=$1 AND key='TENANT-ONLY'",{tenant})[0].value["prefix"]!="SELECTIVE-","nonselected entry unchanged");
 check(call("get",otherCopy,{},false,{other,actor2}).result["prefix"]=="JV-","selective sync isolates tenants");
 auto badSelection=selective;badSelection["mode"]="replace";check(!call("sync","",badSelection).success,"selective replace rejected");
 badSelection=selective;badSelection["templateIds"]=Json::arrayValue;check(!call("sync","",badSelection).success,"empty selection rejected");
 badSelection=selective;badSelection["templateIds"].append(id);check(!call("sync","",badSelection).success,"duplicate selection rejected");
 badSelection=selective;badSelection["templateIds"][0]="bad-id";check(!call("sync","",badSelection).success,"malformed selection rejected");
 badSelection=selective;badSelection["templateIds"].append(extraHost);check(!call("sync","",badSelection).success,"archived template rejected before changes");
 badSelection=selective;badSelection["templateIds"][0]=copy;check(!call("sync","",badSelection).success,"tenant copy cannot be selected as template");
 check(call("sync","",selective,true,{"",actor2}).error["code"]=="forbidden","selective ordinary host forbidden");
 sync["mode"]="replace";
 drogon::TestTransaction::failCommit=true;r=call("sync","",sync);check(!r.success,"replace commit failure reported");drogon::TestTransaction::failCommit=false;
 check(call("get",copy,{},false,{tenant,actor2}).success,"failed replace rolled back deleted rows");
 sql("UPDATE core_system_numbers SET is_deleted=true WHERE tenant_id=$1 AND key='TENANT-ONLY'",{tenant});
 r=call("sync","",sync);check(r.success&&r.result["deleted"]==2&&r.result["copied"]==1,"replace deletes archived and live rows then copies");
 check(!call("get",copy,{},false,{tenant,actor2}).success,"replace creates new IDs");
 check(sql("SELECT count(*) AS n FROM core_system_numbers WHERE tenant_id=$1",{tenant})[0].value["n"]==1,"replace removes tenant-only archived row");
 auto newCopy=call("list","",{},false,{tenant,actor2}).result["data"][0]["id"].asString();
 check(call("delete",id).success,"host soft deletes template");check(!call("get",id).success,"deleted template hidden");check(!call("update",id,body).success,"deleted template cannot be edited");
 check(sql("SELECT * FROM core_system_numbers WHERE id=$1",{id})[0].value["deleted_by_user_id"]==actor,"delete audit");
 check(call("get",newCopy,{},false,{tenant,actor2}).success,"host deletion preserves copy");check(call("update",newCopy,body,false,{tenant,actor2}).success,"copy remains editable after host deletion");
 check(!call("sync","",sync).success,"empty host templates prevent destructive sync");check(call("get",newCopy,{},false,{tenant,actor2}).success,"empty template rejection preserves rows");
 sql("DROP SCHEMA system_number_test CASCADE");drogon::app().getDbClient()->execute={};PQfinish(db);
 std::cout<<checks<<" system number PostgreSQL checks passed\n";
}
