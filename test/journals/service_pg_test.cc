// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport seam.
#include "domain_services/gl/JournalService.h"
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
using business_desk::domain_services::JournalService;
using business_desk::utils::AuditIdentity;
const std::string tenant="10000000-0000-4000-8000-000000000001", other="10000000-0000-4000-8000-000000000002", actor="20000000-0000-4000-8000-000000000001", actor2="20000000-0000-4000-8000-000000000002";
int checks=0;
void check(bool value,const char* label){if(!value)throw std::runtime_error(label);++checks;}
int main(){
 auto* db=PQconnectdb(std::getenv("JOURNAL_TEST_DATABASE_URL"));assert(PQstatus(db)==0);
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
 sql("DROP SCHEMA IF EXISTS journal_test CASCADE");sql("CREATE SCHEMA journal_test");sql("SET search_path TO journal_test");
 sql("CREATE TABLE tenants(id uuid PRIMARY KEY,is_deleted boolean NOT NULL DEFAULT false)");sql("CREATE TABLE users(id uuid PRIMARY KEY)");
 auto migrate=[&](const char* path){std::ifstream file(path);std::string line,clean;while(std::getline(file,line))if(line.find_first_not_of(" \t")!=std::string::npos&&!line.substr(line.find_first_not_of(" \t")).starts_with("--"))clean+=line+"\n";std::stringstream statements(clean);std::string statement;while(std::getline(statements,statement,';'))if(statement.find_first_not_of(" \n\r\t")!=std::string::npos)sql(statement);};
 migrate("database/migrations/001_create_ledger_schema.sql");migrate("database/migrations/007_cost_centers.sql");
 drogon::app().getDbClient()->execute=sql;
 const std::string unit="30000000-0000-4000-8000-000000000001",unit2="30000000-0000-4000-8000-000000000002",currency="40000000-0000-4000-8000-000000000001",usd="40000000-0000-4000-8000-000000000002",account="50000000-0000-4000-8000-000000000001",account2="50000000-0000-4000-8000-000000000002",foreign="50000000-0000-4000-8000-000000000003",period="60000000-0000-4000-8000-000000000001";
 auto call=[&](std::string op,std::string id="",Json::Value body=Json::Value{},std::string u="30000000-0000-4000-8000-000000000001",AuditIdentity who={tenant,actor}){return JournalService::execute(op,id,u,body,who).get();};
 check(call("list").error["code"]=="schema_not_ready","pending migration diagnosed");migrate("database/migrations/012_journals.sql");migrate("database/migrations/012_journals.down.sql");migrate("database/migrations/012_journals.sql");
 sql("INSERT INTO tenants(id) VALUES($1),($2)",{tenant,other});sql("INSERT INTO users VALUES($1),($2)",{actor,actor2});
 sql("INSERT INTO core_currencies(id,code,name) VALUES($1,'GHS','Cedi'),($2,'USD','US dollar')",{currency,usd});
 for(const auto& u:{unit,unit2})sql("INSERT INTO core_accounting_units(id,tenant_id,code,name,base_currency_id) VALUES($1,$2,$4,'Unit',$3)",{u,tenant,currency,u});
 for(auto [u,a,c]:std::vector<std::tuple<std::string,std::string,std::string>>{{unit,account,currency},{unit,account2,currency},{unit,foreign,usd}}){auto group=sql("INSERT INTO gl_account_groups(tenant_id,accounting_unit_id,name,standard_account_type) VALUES($1,$2,$3,0) RETURNING id",{tenant,u,a})[0].value["id"];sql("INSERT INTO gl_accounts(id,tenant_id,accounting_unit_id,account_group_id,account_number,account_name,currency_id,standard_account_type) VALUES($1,$2,$3,$4,$6,'Cash',$5,0)",{a,tenant,u,group,c,a});}
 sql("INSERT INTO gl_accounting_periods(id,tenant_id,accounting_unit_id,period,period_start_date,period_end_date) VALUES($1,$2,$3,202610,'2026-10-01','2026-10-31')",{period,tenant,unit});
 Json::Value input;input["accountingUnitId"]=unit;input["batchDate"]="2026-10-20";input["description"]="Test journal";input["isMultiCurrency"]=false;input["lines"]=Json::arrayValue;
 for(int i=0;i<2;i++){Json::Value l;l["accountId"]=i?account2:account;l["currencyId"]=currency;l["exchangeRate"]="1";l["debit"]=i?"0":"1.123456";l["credit"]=i?"1.123456":"0";input["lines"].append(l);}
 auto create=[&](Json::Value b){auto r=call("create","",b);if(!r.success)std::cerr<<r.toJson()<<std::endl;return r;};
 check(!call("list","",{},unit,{}).success,"anonymous denied");check(!call("list","",{},unit,{other,actor}).success,"foreign tenant denied");check(call("options").result["accounts"].size()==3,"real accounts");check(call("options").result["periods"].size()==1,"real periods");
 auto r=create(input);check(r.success,"create local draft");auto row=r.result;const auto id=row["id"].asString();check(row["status"]=="draft"&&row["totalDebit"]=="1.123456"&&row["lines"].size()==2,"exact local draft");check(sql("SELECT count(*)::int AS n FROM gl_account_balances")[0].value["n"]==0,"draft does not post");check(call("get",id).success&&call("list").result["total"].asInt()==1,"get/list persisted");check(!call("get",id,{},unit2).success,"unit isolation");
 auto second=create(input);check(second.success&&second.result["batchNumber"]!=row["batchNumber"],"multiple null-key drafts and unique sequences");check(call("next-number").result["reserved"]==false,"preview does not reserve");
 auto update=input;update["version"]=row["version"];update["description"]="Edited";for(int i=0;i<2;i++)update["lines"][i]["id"]=row["lines"][i]["id"];
 r=call("update",id,update,unit,{tenant,actor2});check(r.success&&r.result["version"]==2&&r.result["lines"][0]["id"]==row["lines"][0]["id"],"update stable IDs and version");check(!call("update",id,update).success,"stale update rejected");row=r.result;
 check(sql("SELECT last_modified_by_user_id FROM gl_journal_batches WHERE id=$1",{id})[0].value["last_modified_by_user_id"]==actor2,"modify audit");
 for(auto field:{"tenantId","status","batchNumber","createdByUserId","totalDebit"}){auto bad=input;bad[field]="spoof";check(!call("create","",bad).success,"server-owned fields rejected");}
 for(auto invalid:{"-1","0.1234567","100000000000000","1e3"}){auto bad=input;bad["lines"][0]["debit"]=invalid;check(!call("create","",bad).success,"invalid money rejected");}
 auto bad=input;bad["lines"][0]["accountId"]=foreign;check(!call("create","",bad).success,"GL/currency mismatch denied");bad=input;bad["lines"][0]["credit"]="1";check(!call("create","",bad).success,"both sides rejected");bad=input;bad["lines"][0]["exchangeRate"]="2";check(!call("create","",bad).success,"base rate must be one");bad=input;bad["lines"][0]["organizationUnitId"]=unit;check(!call("create","",bad).success,"fake organizations rejected");bad=input;bad["lines"][0]["debit"]=1;check(!call("create","",bad).success,"JSON numeric money rejected");
 Json::Value post;post["accountingUnitId"]=unit;post["version"]=row["version"];check(!call("post",id,post).success,"period required for posting");post["periodId"]=period;
 sql("UPDATE gl_accounting_periods SET status='closed' WHERE id=$1 AND is_deleted=false",{period});check(!call("post",id,post).success,"closed period prevents posting");sql("UPDATE gl_accounting_periods SET status='open' WHERE id=$1 AND is_deleted=false",{period});
 // Inject an actual SQL error after the balance update: whole posting must roll back.
 bool lockVerified=false;bool breakHistory=true;drogon::app().getDbClient()->execute=[&](const std::string& q,const std::vector<Json::Value>& p){if(!lockVerified&&q.find("core_accounting_units")!=std::string::npos&&q.find("FOR UPDATE")!=std::string::npos){
 auto result=sql(q,p);auto* c=PQconnectdb(std::getenv("JOURNAL_TEST_DATABASE_URL"));const char* value=unit.c_str();auto* locked=PQexecParams(c,"SELECT id FROM journal_test.core_accounting_units WHERE id=$1 FOR UPDATE NOWAIT",1,nullptr,&value,nullptr,nullptr,0);const char* code=PQresultErrorField(locked,'C');check(code&&std::string(code)=="55P03","competing connection cannot acquire posting unit lock");PQclear(locked);PQfinish(c);lockVerified=true;return result;}
 if(breakHistory&&q.find("INSERT INTO gl_journal_history")!=std::string::npos)sql("SELECT 1/0");return sql(q,p);};check(!call("post",id,post).success,"posting failure surfaced");breakHistory=false;check(call("get",id).result["status"]=="draft"&&sql("SELECT count(*)::int AS n FROM gl_account_balances")[0].value["n"]==0,"posting rollback includes status/balances");
 r=call("post",id,post);if(!r.success)std::cerr<<r.toJson()<<std::endl;check(r.success&&r.result["status"]=="posted","final posting");check(sql("SELECT debit_balance::text AS d FROM gl_account_balances WHERE account_id=$1",{account})[0].value["d"]=="1.123456","local balance exact");check(call("post",id,post).success&&sql("SELECT debit_balance::text AS d FROM gl_account_balances WHERE account_id=$1",{account})[0].value["d"]=="1.123456","repeat post cannot double balances");check(sql("SELECT count(*)::int AS n FROM gl_journal_history WHERE journal_batch_id=$1 AND is_deleted=false",{id})[0].value["n"]==1,"one posting snapshot");
 update["version"]=r.result["version"];check(!call("update",id,update).success,"posted immutable");Json::Value del;del["accountingUnitId"]=unit;del["version"]=r.result["version"];check(!call("delete",id,del).success,"posted delete denied");
 auto fx=input;fx["isMultiCurrency"]=true;fx["lines"][0]["accountId"]=foreign;fx["lines"][0]["currencyId"]=usd;fx["lines"][0]["exchangeRate"]="12.5";fx["lines"][0]["debit"]="2.000001";fx["lines"][1]["credit"]="25.000013";
 r=create(fx);check(r.success&&r.result["totalDebit"]=="25.000013","FX half-up conversion exact");auto fxId=r.result["id"].asString();
 auto fxEdit=fx;fxEdit["version"]=r.result["version"];for(int i=0;i<2;i++)fxEdit["lines"][i]["id"]=r.result["lines"][i]["id"];fxEdit["lines"][0]["exchangeRate"]="13.5";fxEdit["lines"][1]["credit"]="27.000014";
 r=call("update",fxId,fxEdit);check(r.success&&r.result["totalDebit"]=="27.000014","FX draft rate/amount update");post["version"]=r.result["version"];check(call("post",fxId,post).success,"mixed-currency posting");auto bal=sql("SELECT debit_balance::text AS d,foreign_debit_balance::text AS f FROM gl_account_balances WHERE account_id=$1",{foreign})[0].value;check(bal["d"]=="27.000014"&&bal["f"]=="2.000001","base and transaction balances distinct");
 auto unbalanced=input;unbalanced["lines"][1]["credit"]="2";r=create(unbalanced);check(r.success,"unbalanced drafts allowed");post["version"]=r.result["version"];check(!call("post",r.result["id"].asString(),post).success,"unbalanced posting denied");
 del["version"]=second.result["version"];check(call("delete",second.result["id"].asString(),del).success,"draft delete");check(!call("get",second.result["id"].asString()).success,"deleted draft hidden");check(sql("SELECT count(*)::int AS n FROM gl_journal_lines WHERE journal_batch_id=$1 AND is_deleted=false",{second.result["id"]})[0].value["n"]==0,"live lines soft deleted");
 // Reorder retained lines and archive removed ones without restoring IDs.
 auto reorder=create(input);const std::string reorderId=reorder.result["id"].asString();auto reordered=input;reordered["version"]=reorder.result["version"];reordered["lines"][0]["id"]=reorder.result["lines"][1]["id"];reordered["lines"][0]["accountId"]=account2;reordered["lines"][1]["id"]=reorder.result["lines"][0]["id"];reordered["lines"][1]["accountId"]=account;
 auto shuffled=call("update",reorderId,reordered);check(shuffled.success&&shuffled.result["lines"][0]["id"]==reorder.result["lines"][1]["id"],"stable line IDs can be reordered");
 reordered["version"]=shuffled.result["version"];reordered["lines"][0]["id"]=row["lines"][0]["id"];check(!call("update",reorderId,reordered).success,"other batch line IDs rejected");
 auto replace=input;replace["version"]=shuffled.result["version"];auto replaced=call("update",reorderId,replace);check(replaced.success&&replaced.result["lines"][0]["id"]!=shuffled.result["lines"][0]["id"],"omitted IDs create new live lines");
 auto archived=sql("SELECT is_deleted,line_number FROM gl_journal_lines WHERE id=$1",{shuffled.result["lines"][0]["id"]})[0].value;check(archived["is_deleted"].asBool()&&archived["line_number"].asInt()==1,"removed line retains audited history/position");
 shuffled=replaced;
 for(auto col:{"allow_manual_posting","is_control_account"}){const std::string value=std::string(col)=="allow_manual_posting"?"false":"true";sql(std::string("UPDATE gl_accounts SET ")+col+"="+value+" WHERE id=$1 AND is_deleted=false",{account});check(!call("create","",input).success,"manual/control restrictions enforced");sql(std::string("UPDATE gl_accounts SET ")+col+"="+(value=="true"?"false":"true")+" WHERE id=$1 AND is_deleted=false",{account});}
 sql("UPDATE core_currencies SET is_active=false WHERE id=$1 AND is_deleted=false",{usd});check(!call("create","",fx).success,"inactive currency denied");sql("UPDATE core_currencies SET is_active=true WHERE id=$1 AND is_deleted=false",{usd});
 auto dateMismatch=input;dateMismatch["lines"][0]["transactionDate"]="2026-11-01";auto mismatched=create(dateMismatch);post["version"]=mismatched.result["version"];check(!call("post",mismatched.result["id"].asString(),post).success,"out-of-period line cannot post");
 sql("UPDATE gl_journal_lines SET is_reconciled=true WHERE journal_batch_id=$1 AND is_deleted=false",{reorderId});auto processedBody=input;processedBody["version"]=shuffled.result["version"];check(!call("update",reorderId,processedBody).success,"processed draft lines protected");
 auto policy=sql("INSERT INTO gl_approval_policies(tenant_id,accounting_unit_id,transaction_type) VALUES($1,$2,'general_journal') RETURNING id",{tenant,unit})[0].value["id"];
 auto blocked=create(input);post["version"]=blocked.result["version"];check(call("post",blocked.result["id"].asString(),post).error["code"]=="approval_required","configured approval policy cannot be bypassed");sql("UPDATE gl_approval_policies SET is_active=false WHERE id=$1",{policy});
 drogon::TestTransaction::failCommit=true;check(!call("create","",input).success,"commit failure surfaced");drogon::TestTransaction::failCommit=false;
 check(lockVerified,"real connection locking exercised");
 auto extreme=fx;extreme["lines"][0]["debit"]="0.000001";extreme["lines"][0]["exchangeRate"]="9999999999.9999999999";extreme["lines"][1]["credit"]="10000";auto maxRate=create(extreme);check(maxRate.success,"maximum numeric(20,10) rate allowed");post["version"]=maxRate.result["version"];check(call("post",maxRate.result["id"].asString(),post).success,"rate weighting does not overflow at rounding boundary");
 auto mixedLocal=fx;mixedLocal["isMultiCurrency"]=false;check(!create(mixedLocal).success,"mixed currencies require multi-currency mode");
 auto singleForeign=input;singleForeign["isMultiCurrency"]=false;for(auto& line:singleForeign["lines"]){line["accountId"]=foreign;line["currencyId"]=usd;line["exchangeRate"]="12.5";}
 auto foreignDraft=create(singleForeign);check(foreignDraft.success&&foreignDraft.result["isMultiCurrency"]==false&&foreignDraft.result["totalDebit"]=="14.043200","single foreign-currency draft converts to unit base exactly");
 post["version"]=foreignDraft.result["version"];check(call("post",foreignDraft.result["id"].asString(),post).success,"single foreign-currency journal posts atomically");
 sql("UPDATE gl_accounts SET is_deleted=true WHERE id=$1 AND is_deleted=false",{account});check(!call("create","",input).success,"deleted account rejected");check(call("options").result["accounts"].size()==2,"deleted account omitted");
 sql("DROP SCHEMA journal_test CASCADE");PQfinish(db);std::cout<<checks<<" journal PostgreSQL checks passed\n";
}
