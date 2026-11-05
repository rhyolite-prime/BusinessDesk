// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport seam.
#include "domain_services/gl/DefaultGlNumberService.h"
#include <drogon/orm/CoroMapper.h>
#include <cassert>
#include "dto/DefaultGlFields.h"
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
using business_desk::domain_services::DefaultGlNumberService;
using business_desk::utils::AuditIdentity;
const std::string tenant="10000000-0000-4000-8000-000000000001", other="10000000-0000-4000-8000-000000000002", actor="20000000-0000-4000-8000-000000000001", actor2="20000000-0000-4000-8000-000000000002";
int checks=0;
void check(bool value,const char* label){if(!value)throw std::runtime_error(label);++checks;}
int main(){
 auto* db=PQconnectdb(std::getenv("DEFAULT_GL_TEST_DATABASE_URL"));assert(PQstatus(db)==0);
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
 sql("DROP SCHEMA IF EXISTS default_gl_test CASCADE");sql("CREATE SCHEMA default_gl_test");sql("SET search_path TO default_gl_test");
 auto migrate=[&](const char* path){std::ifstream file(path);std::string line,clean;while(std::getline(file,line))if(line.find_first_not_of(" \t")!=std::string::npos&&!line.substr(line.find_first_not_of(" \t")).starts_with("--"))clean+=line+"\n";std::stringstream statements(clean);std::string statement;while(std::getline(statements,statement,';'))if(statement.find_first_not_of(" \n\r\t")!=std::string::npos)sql(statement);};
 migrate("database/migrations/001_create_ledger_schema.sql");migrate("database/migrations/009_default_gl_numbers.sql");
 const std::string unit="30000000-0000-4000-8000-000000000001",unit2="30000000-0000-4000-8000-000000000002",foreign="30000000-0000-4000-8000-000000000003",currency="40000000-0000-4000-8000-000000000001";
 sql("INSERT INTO core_currencies(id,code,name) VALUES($1,'GHS','Cedi')",{currency});
 for(auto [id,t]:std::vector<std::pair<std::string,std::string>>{{unit,tenant},{unit2,tenant},{foreign,other}})sql("INSERT INTO core_accounting_units(id,tenant_id,code,name,base_currency_id) VALUES($1,$2,$4,'Unit',$3)",{id,t,currency,id});
 const std::string account="50000000-0000-4000-8000-000000000001",bank="60000000-0000-4000-8000-000000000001",category="70000000-0000-4000-8000-000000000001",otherAccount="50000000-0000-4000-8000-000000000002",foreignAccount="50000000-0000-4000-8000-000000000003";
 for(auto [u,t,a]:std::vector<std::tuple<std::string,std::string,std::string>>{{unit,tenant,account},{unit2,tenant,otherAccount},{foreign,other,foreignAccount}}){
  auto group=sql("INSERT INTO gl_account_groups(tenant_id,accounting_unit_id,name,standard_account_type) VALUES($1,$2,'Assets',0) RETURNING id",{t,u})[0].value["id"];
  sql("INSERT INTO gl_accounts(id,tenant_id,accounting_unit_id,account_group_id,account_number,account_name,standard_account_type) VALUES($1,$2,$3,$4,'100','Cash',0)",{a,t,u,group});
 }
 sql("INSERT INTO gl_bank_accounts(id,tenant_id,accounting_unit_id,account_id,account_number,currency_id,bank_name) VALUES($1,$2,$3,$4,'123',$5,'Test Bank')",{bank,tenant,unit,account,currency});
 sql("INSERT INTO gl_imprest_categories(id,tenant_id,accounting_unit_id,name) VALUES($1,$2,$3,'Travel')",{category,tenant,unit});
 bool lockVerified=false;
 drogon::app().getDbClient()->execute=[&](const std::string& q,const std::vector<Json::Value>& p){auto r=sql(q,p);
  if(!lockVerified&&q.find("core_accounting_units")!=std::string::npos&&q.find("FOR UPDATE")!=std::string::npos){
   auto* competitor=PQconnectdb(std::getenv("DEFAULT_GL_TEST_DATABASE_URL"));assert(PQstatus(competitor)==0);const char* id=unit.c_str();auto* result=PQexecParams(competitor,"SELECT id FROM default_gl_test.core_accounting_units WHERE id=$1 FOR UPDATE NOWAIT",1,nullptr,&id,nullptr,nullptr,0);const char* code=PQresultErrorField(result,'C');check(code&&std::string(code)=="55P03","unit locked during mutation");PQclear(result);PQfinish(competitor);lockVerified=true;
  }return r;
 };
 auto call=[&](std::string op,std::string id="",Json::Value body=Json::Value{},std::string u="30000000-0000-4000-8000-000000000001",AuditIdentity who={tenant,actor}){return DefaultGlNumberService::execute(op,id,u,body,who).get();};
 check(!call("list","",{},unit,{}).success,"anonymous denied");check(!call("list","",{},unit,{"",actor}).success,"host scope denied");check(!call("list","",{},foreign).success,"foreign unit denied");check(!call("list","",{},"bad").success,"invalid unit rejected");
 check(call("list").result["data"].empty(),"initial empty list");auto options=call("options");check(options.success&&options.result["account"].size()==1&&options.result["bank"].size()==1&&options.result["category"].size()==1,"real scoped lookup choices");
 Json::Value body;body["accountingUnitId"]=unit;body["vatRate"]=0.15;
 for(auto& f:business_desk::dto::default_gl::fields)body[f.name]=std::string(f.table)=="gl_accounts"?account:std::string(f.table)=="gl_bank_accounts"?bank:category;
 auto created=call("create","",body);check(created.success,"create all 38 mappings");const auto id=created.result["id"].asString();
 for(auto& f:business_desk::dto::default_gl::fields)check(created.result[f.name]==body[f.name],"every C# field roundtrips to correct column");
 check(created.result["vatRate"]==0.15&&created.result["accountingUnitId"]==unit,"VAT fraction and unit roundtrip");check(sql("SELECT created_by_user_id FROM gl_default_accounts WHERE id=$1",{id})[0].value["created_by_user_id"]==actor,"creation actor audit");
 Json::Value alias;alias["accountingUnitId"]=unit;alias["payRollBankAccountId"]=bank;check(call("update",id,alias).success,"C# PayRoll spelling accepted");alias["payrollBankAccountId"]=bank;check(!call("update",id,alias).success,"ambiguous payroll aliases rejected");
 check(!call("create","",body).success,"one live configuration per unit");check(call("get",id).success,"get record");check(!call("get",id,{},unit2).success&&!call("get",id,{},unit,{other,actor2}).success,"get unit and tenant isolated");
 Json::Value patch;patch["accountingUnitId"]=unit;patch["vatRate"]=0.123456;
 auto updated=call("update",id,patch,unit,{tenant,actor2});check(updated.success&&updated.result["salesRevenueAccountId"]==account&&updated.result["vatRate"]==0.123456,"partial update preserves omitted mappings");check(sql("SELECT last_modified_by_user_id FROM gl_default_accounts WHERE id=$1",{id})[0].value["last_modified_by_user_id"]==actor2,"update actor audit");
 for(auto& value:{-0.1,1.01,0.1234567}){patch["vatRate"]=value;check(!call("update",id,patch).success,"VAT bounds and precision");}patch["vatRate"]="0.15";check(!call("update",id,patch).success,"numeric strings rejected");patch["vatRate"]=0.15;
 for(auto& key:{"tenantId","createdByUserId","isDeleted","id","accounting_unit_id"}){auto bad=patch;bad[key]="forged";check(!call("update",id,bad).success,"scope/audit injection rejected");}
 for(auto& f:business_desk::dto::default_gl::fields){auto bad=patch;bad[f.name]="not-uuid";check(!call("update",id,bad).success,"all GUID inputs validated");}
 patch["salesRevenueAccountId"]=otherAccount;check(!call("update",id,patch).success,"cross-unit GL reference denied");patch["salesRevenueAccountId"]=foreignAccount;check(!call("update",id,patch).success,"cross-tenant GL reference denied");patch.removeMember("salesRevenueAccountId");
 sql("UPDATE gl_accounts SET status='inactive' WHERE id=$1",{account});check(!call("update",id,patch).success,"inactive GL rejected");options=call("options");check(options.result["account"].empty()&&options.result["bank"].empty(),"inactive accounts and backed banks hidden");sql("UPDATE gl_accounts SET status='active',is_deleted=true WHERE id=$1",{account});check(!call("update",id,patch).success,"deleted GL rejected");sql("UPDATE gl_accounts SET is_deleted=false WHERE id=$1",{account});
 sql("UPDATE gl_bank_accounts SET is_active=false WHERE id=$1",{bank});check(!call("update",id,patch).success,"inactive bank rejected");sql("UPDATE gl_bank_accounts SET is_active=true,is_deleted=true WHERE id=$1",{bank});check(!call("update",id,patch).success,"deleted bank rejected");sql("UPDATE gl_bank_accounts SET is_deleted=false WHERE id=$1",{bank});
 sql("UPDATE gl_imprest_categories SET is_deleted=true WHERE id=$1",{category});check(!call("update",id,patch).success,"deleted category rejected");sql("UPDATE gl_imprest_categories SET is_deleted=false WHERE id=$1",{category});
 patch["salesRevenueAccountId"]="00000000-0000-0000-0000-000000000000";check(call("update",id,patch).result["salesRevenueAccountId"].isNull(),"Guid.Empty clears mapping");
 patch["accountingUnitId"]=unit2;check(!call("update",id,patch).success,"cannot move record to another unit");patch["accountingUnitId"]=unit;
 drogon::TestTransaction::failCommit=true;patch["vatRate"]=0.25;check(!call("update",id,patch).success,"failed commit never reports success");drogon::TestTransaction::failCommit=false;check(call("get",id).result["vatRate"]==0.15,"failed transaction rolls back");
 check(!call("delete",id,{},unit2).success,"cross-unit deletion denied");check(call("delete",id).success,"soft deletion");auto stored=sql("SELECT * FROM gl_default_accounts WHERE id=$1",{id})[0].value;check(stored["is_deleted"].asBool()&&stored["deleted_by_user_id"]==actor,"deletion audit");check(!call("get",id).success&&!call("update",id,patch).success&&!call("delete",id).success&&call("list").result["data"].empty(),"deleted records excluded from every operation");
 auto recreated=call("create","",body);check(recreated.success&&recreated.result["id"]!=id,"recreation after soft deletion uses new ID");check(sql("SELECT id FROM gl_default_accounts WHERE tenant_id=$1 AND accounting_unit_id=$2",{tenant,unit}).size()==2,"historical record retained");
 Json::Value second;second["accountingUnitId"]=unit2;check(call("create","",second,unit2).success,"separate units independent; unconfigured nullable defaults supported");
 sql("UPDATE core_accounting_units SET is_active=false WHERE id=$1",{unit});check(!call("list").success&&!call("options").success&&!call("delete",recreated.result["id"].asString()).success,"inactive unit excluded");
 drogon::app().getDbClient()->execute={};sql("DROP SCHEMA default_gl_test CASCADE");PQfinish(db);std::cout<<checks<<" default GL PostgreSQL checks passed\n";
}
