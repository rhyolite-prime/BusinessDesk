// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport seam.
#include "domain_services/gl/BudgetService.h"
#include <drogon/orm/CoroMapper.h>
#include <cassert>
#include "domain_services/shared/CostCenterService.h"


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
using business_desk::domain_services::BudgetService;
using business_desk::utils::AuditIdentity;
const std::string tenant="10000000-0000-4000-8000-000000000001", other="10000000-0000-4000-8000-000000000002", actor="20000000-0000-4000-8000-000000000001", actor2="20000000-0000-4000-8000-000000000002";
int checks=0;
void check(bool value,const char* label){if(!value)throw std::runtime_error(label);++checks;}
int main(){
 auto* db=PQconnectdb(std::getenv("BUDGET_TEST_DATABASE_URL"));assert(PQstatus(db)==0);
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
 sql("DROP SCHEMA IF EXISTS budget_test CASCADE");sql("CREATE SCHEMA budget_test");sql("SET search_path TO budget_test");
 sql("CREATE TABLE tenants(id uuid PRIMARY KEY,is_deleted boolean NOT NULL DEFAULT false)");sql("CREATE TABLE users(id uuid PRIMARY KEY)");
 auto migrate=[&](const char* path){std::ifstream file(path);std::string line,clean;while(std::getline(file,line))if(line.find_first_not_of(" \t")!=std::string::npos&&!line.substr(line.find_first_not_of(" \t")).starts_with("--"))clean+=line+"\n";std::stringstream statements(clean);std::string statement;while(std::getline(statements,statement,';'))if(statement.find_first_not_of(" \n\r\t")!=std::string::npos)sql(statement);};
 migrate("database/migrations/001_create_ledger_schema.sql");migrate("database/migrations/007_cost_centers.sql");
 // Reproduce the reported deployment: original detail table, no migration 011.
 drogon::app().getDbClient()->execute=sql;
 const std::string pendingUnit="30000000-0000-4000-8000-000000000001";
 Json::Value pendingBody;pendingBody["accountingUnitId"]=pendingUnit;
 for(auto op:{"list","get","options","create","update","delete"}){
  auto pending=BudgetService::execute(op,tenant,pendingUnit,pendingBody,{tenant,actor}).get();
  check(!pending.success&&pending.error["code"]=="schema_not_ready"&&pending.error["message"].asString().find("011_budgets.sql")!=std::string::npos,"unmigrated API reports required upgrade without executing missing-column SQL");
 }
 migrate("database/migrations/011_budgets.sql");
 migrate("database/migrations/011_budgets.down.sql");migrate("database/migrations/011_budgets.sql");check(true,"clean migration up/down/up");
 sql("INSERT INTO tenants(id) VALUES($1),($2)",{tenant,other});sql("INSERT INTO users VALUES($1),($2)",{actor,actor2});
 const std::string unit="30000000-0000-4000-8000-000000000001",unit2="30000000-0000-4000-8000-000000000002",foreign="30000000-0000-4000-8000-000000000003",currency="40000000-0000-4000-8000-000000000001";
 sql("INSERT INTO core_currencies(id,code,name) VALUES($1,'GHS','Cedi')",{currency});
 for(auto [id,t]:std::vector<std::pair<std::string,std::string>>{{unit,tenant},{unit2,tenant},{foreign,other}})sql("INSERT INTO core_accounting_units(id,tenant_id,code,name,base_currency_id) VALUES($1,$2,$4,'Unit',$3)",{id,t,currency,id});
 const std::string account="50000000-0000-4000-8000-000000000001",bank="60000000-0000-4000-8000-000000000001",category="70000000-0000-4000-8000-000000000001",otherAccount="50000000-0000-4000-8000-000000000002",foreignAccount="50000000-0000-4000-8000-000000000003";
 for(auto [u,t,a]:std::vector<std::tuple<std::string,std::string,std::string>>{{unit,tenant,account},{unit2,tenant,otherAccount},{foreign,other,foreignAccount}}){
  auto group=sql("INSERT INTO gl_account_groups(tenant_id,accounting_unit_id,name,standard_account_type) VALUES($1,$2,'Assets',0) RETURNING id",{t,u})[0].value["id"];
  sql("INSERT INTO gl_accounts(id,tenant_id,accounting_unit_id,account_group_id,account_number,account_name,standard_account_type) VALUES($1,$2,$3,$4,'100','Cash',0)",{a,t,u,group});
 }
 const std::string center="a0000000-0000-4000-8000-000000000001",otherCenter="a0000000-0000-4000-8000-000000000002";
 sql("INSERT INTO core_cost_centers(id,tenant_id,name,created_by_user_id) VALUES($1,$2,'Live center',$3),($4,$5,'Foreign center',$3)",{center,tenant,actor,otherCenter,other});
 bool lockVerified=false,breakFinalRead=false;int failAtDetail=0;
 drogon::app().getDbClient()->execute=[&](const std::string& q,const std::vector<Json::Value>& params){
  if(failAtDetail&&q.find("INSERT INTO gl_budget_details")!=std::string::npos&&--failAtDetail==0)sql("SELECT 1/0");
  auto result=sql(q,params);
  if(breakFinalRead&&q.find("SELECT jsonb_build_object")!=std::string::npos&&q.find("AND b.id=$3")!=std::string::npos&&q.find("FOR UPDATE OF b")==std::string::npos)throw std::runtime_error("Non-SQL response serialization failure");
  if(!lockVerified&&q.find("core_accounting_units")!=std::string::npos&&q.find("FOR UPDATE")!=std::string::npos){auto* competitor=PQconnectdb(std::getenv("BUDGET_TEST_DATABASE_URL"));assert(PQstatus(competitor)==0);const char* value=unit.c_str();auto* locked=PQexecParams(competitor,"SELECT id FROM budget_test.core_accounting_units WHERE id=$1 FOR UPDATE NOWAIT",1,nullptr,&value,nullptr,nullptr,0);const char* code=PQresultErrorField(locked,'C');check(code&&std::string(code)=="55P03","unit write lock serializes scoped mutations");PQclear(locked);PQfinish(competitor);lockVerified=true;}
  return result;
 };
 auto call=[&](std::string op,std::string id="",Json::Value body=Json::Value{},std::string u="30000000-0000-4000-8000-000000000001",AuditIdentity who={tenant,actor}){return BudgetService::execute(op,id,u,body,who).get();};
 auto denied=[&](const Json::Value& b,const char* label){auto r=call("create","",b);check(!r.success&&r.error["code"]=="validation_error",label);};
 check(!call("list","",{},unit,{}).success,"anonymous denied");check(!call("list","",{},unit,{"",actor}).success,"host denied");check(!call("list","",{},foreign).success,"foreign unit denied");check(!call("list","",{},"bad").success,"invalid unit rejected");check(!call("unknown").success,"unknown op denied");
 auto opts=call("options");check(opts.success&&opts.result["accounts"].size()==1&&opts.result["accounts"][0]["id"]==account&&opts.result["costCenters"].size()==1&&opts.result["costCenters"][0]["id"]==center,"real GL/unit and cost-center/tenant lookups");check(call("list").result["data"].empty(),"initial empty list");
 Json::Value input;input["accountingUnitId"]=unit;input["accountId"]=account;input["costCenterId"]=center;input["beginDate"]="2026-01-01";input["endDate"]="2026-03-01";input["details"]=Json::arrayValue;
 for(int m=1;m<=3;m++){Json::Value d;d["month"]=m;d["year"]=2026;d["budgetAmount"]=m==1?"99999999999999.999999":"0.000001";d["revisedAmount"]="1.234567";input["details"].append(d);}
 auto r=call("create","",input);if(!r.success)std::cerr<<r.toJson()<<std::endl;check(r.success,"persist header with complete details");const std::string id=r.result["id"].asString(),detailId=r.result["details"][0]["id"].asString();
 check(r.result["status"]=="draft"&&r.result["accountName"]=="Cash"&&r.result["costCenterName"]=="Live center","derived header/status/defaults");check(r.result["details"].size()==3&&r.result["details"][0]["budgetAmount"]=="99999999999999.999999"&&r.result["details"][1]["budgetAmount"]=="0.000001","numeric(20,6) exact decimal serialization");
 check(sql("SELECT created_by_user_id FROM gl_budgets WHERE id=$1",{id})[0].value["created_by_user_id"]==actor&&sql("SELECT created_by_user_id FROM gl_budget_details WHERE id=$1",{detailId})[0].value["created_by_user_id"]==actor,"header and detail creation audit");
 check(call("get",id).success&&call("list").result["data"].size()==1,"read list and detail");check(!call("get",id,{},unit2).success&&!call("delete",id,{},unit2).success,"unit isolation");check(!call("get",id,{},unit,{other,actor}).success,"tenant isolation");check(!call("create","",input).success,"duplicate schedule conflict");
 for(const auto& field:{"tenantId","id","createdByUserId","lastModifiedAt","isDeleted","organizationUnitName","accountName"}){auto bad=input;bad[field]="spoof";denied(bad,"client identity/display/audit override denied");}
 auto bad=input;bad["accountingUnitId"]=unit2;denied(bad,"body scope mismatch denied");bad=input;bad["accountId"]=otherAccount;denied(bad,"other-unit GL denied");bad=input;bad["accountId"]=foreignAccount;denied(bad,"foreign GL denied");bad=input;bad["costCenterId"]=otherCenter;denied(bad,"foreign cost center denied");bad=input;bad["organizationUnitId"]=center;denied(bad,"demo organization assignments denied");bad=input;bad["status"]="approved";denied(bad,"approval not exposed by CRUD");
 for(auto invalid:std::vector<Json::Value>{Json::Value(-1),Json::Value(0.5),Json::Value("-1"),Json::Value("1e3"),Json::Value("0.1234567"),Json::Value("100000000000000"),Json::Value("NaN"),Json::Value("01.2"),Json::Value(" 1"),Json::Value("1."),Json::Value(Json::nullValue)}){bad=input;bad["details"][0]["budgetAmount"]=invalid;denied(bad,"invalid/overflow/non-string amount denied");}
 bad=input;bad["details"][0]["month"]=2;denied(bad,"duplicate periods denied");bad=input;bad["details"][0]["year"]=2025;denied(bad,"out-of-range period denied");bad=input;bad["details"][0]["month"]="1";denied(bad,"string month denied");bad=input;bad["details"][0]["id"]=detailId;denied(bad,"client detail IDs denied");bad=input;bad["details"].removeIndex(0,nullptr);denied(bad,"missing period denied");bad=input;bad["beginDate"]="2026-02-30";denied(bad,"invalid day denied");bad=input;bad["endDate"]="2025-01-01";denied(bad,"reversed bounds denied");bad=input;bad["endDate"]="2031-01-01";denied(bad,"61-month range denied");
 Json::Value patch;patch["accountingUnitId"]=unit;patch["costCenterId"]=Json::nullValue;
 r=call("update",id,patch,unit,{tenant,actor2});check(r.success&&r.result["costCenterId"].isNull()&&r.result["details"][0]["budgetAmount"]=="99999999999999.999999","partial update preserves exact amounts");check(r.result["details"][0]["id"]==detailId,"retained period has stable ID");
 check(sql("SELECT last_modified_by_user_id FROM gl_budgets WHERE id=$1",{id})[0].value["last_modified_by_user_id"]==actor2&&sql("SELECT created_by_user_id,last_modified_by_user_id FROM gl_budget_details WHERE id=$1",{detailId})[0].value["created_by_user_id"]==actor&&sql("SELECT last_modified_by_user_id FROM gl_budget_details WHERE id=$1",{detailId})[0].value["last_modified_by_user_id"]==actor2,"modify actor and creation history");
 // Real statement failure after header and first detail write must roll back everything.
 auto change=input;change["details"][0]["revisedAmount"]="88.000001";failAtDetail=2;r=call("update",id,change);check(!r.success&&r.error["code"]=="database_error","statement failure surfaced");r=call("get",id);check(r.result["costCenterId"].isNull()&&r.result["details"][0]["revisedAmount"]=="1.234567","atomic rollback of header and earlier detail writes");
 breakFinalRead=true;r=call("update",id,change);breakFinalRead=false;check(!r.success,"non-SQL exception surfaced");check(call("get",id).result["costCenterId"].isNull(),"non-SQL failure rolls back rather than destructor commit");
 drogon::TestTransaction::failCommit=true;r=call("update",id,change);drogon::TestTransaction::failCommit=false;check(!r.success,"commit failure surfaced");check(call("get",id).result["costCenterId"].isNull(),"commit failure rollback");
 const std::string removed=call("get",id).result["details"][2]["id"].asString();
 auto shorter=input;shorter["endDate"]="2026-02-01";shorter["details"].removeIndex(2,nullptr);r=call("update",id,shorter);check(r.success&&r.result["details"].size()==2,"shrink monthly range");check(sql("SELECT is_deleted,deleted_by_user_id FROM gl_budget_details WHERE id=$1",{removed})[0].value["is_deleted"].asBool(),"removed period soft-deleted");
 r=call("update",id,input);check(r.success&&r.result["details"][2]["id"].asString()!=removed,"re-added period gets new ID, not resurrected history");check(sql("SELECT last_modified_by_user_id FROM gl_budget_details WHERE id=$1",{removed})[0].value["last_modified_by_user_id"]==actor,"deleted detail history unchanged");
 for(auto status:{"submitted","approved","closed"}){sql("UPDATE gl_budgets SET status=$2 WHERE id=$1 AND is_deleted=false",{id,status});check(!call("update",id,patch).success&&!call("delete",id).success,"non-draft read-only");check(call("get",id).result["status"]==status,"non-draft still readable");}sql("UPDATE gl_budgets SET status='draft' WHERE id=$1 AND is_deleted=false",{id});
 auto composite=sql("INSERT INTO gl_budget_composites(tenant_id,accounting_unit_id,code,name,begin_date,end_date) VALUES($1,$2,'BUD','Budget composite','2026-01-01','2026-03-01') RETURNING id",{tenant,unit})[0].value["id"];
 sql("INSERT INTO gl_budget_composite_lines(tenant_id,accounting_unit_id,composite_id,budget_id) VALUES($1,$2,$3,$4)",{tenant,unit,composite,id});check(!call("update",id,patch).success&&!call("delete",id).success,"live composite protects update and deletion");
 sql("UPDATE gl_budget_composites SET is_deleted=true WHERE id=$1 AND is_deleted=false",{composite});check(call("update",id,patch).success,"deleted composite no longer blocks");
 sql("UPDATE gl_budgets SET organization_unit_id=$2,organization_unit_name='Legacy department' WHERE id=$1 AND is_deleted=false",{id,center});r=call("update",id,patch);check(r.success&&r.result["organizationUnitId"]==center&&r.result["organizationUnitName"]=="Legacy department","legacy org scope preserved on omitted update");patch["organizationUnitId"]=Json::nullValue;r=call("update",id,patch);check(r.success&&r.result["organizationUnitId"].isNull()&&r.result["organizationUnitName"]=="","legacy org explicitly clearable");
 sql("UPDATE gl_accounts SET status='inactive' WHERE id=$1 AND is_deleted=false",{account});check(call("options").result["accounts"].empty()&&!call("update",id,patch).success,"inactive GL unavailable and rejected");sql("UPDATE gl_accounts SET status='active',is_deleted=true WHERE id=$1 AND is_deleted=false",{account});check(call("options").result["accounts"].empty()&&!call("create","",input).success,"deleted GL unavailable and rejected");sql("UPDATE gl_accounts SET is_deleted=false WHERE id=$1",{account});
 sql("UPDATE core_cost_centers SET is_deleted=true WHERE id=$1 AND is_deleted=false",{center});check(call("options").result["costCenters"].empty()&&!call("create","",input).success,"deleted cost center unavailable and rejected");sql("UPDATE core_cost_centers SET is_deleted=false WHERE id=$1",{center});
 // Existing cost-center CRUD must see persisted budget references.
 check(call("update",id,input).success,"restore cost-center reference");auto centerDelete=business_desk::domain_services::CostCenterService::execute("delete",center,{}, {tenant,actor}).get();check(!centerDelete.success&&centerDelete.error["code"]=="conflict","persisted budget protects referenced cost center");
 r=call("delete",id,{},unit,{tenant,actor2});check(r.success&&r.result["isDeleted"].asBool(),"soft delete persisted budget");check(!call("get",id).success&&!call("delete",id).success&&!call("update",id,patch).success&&call("list").result["data"].empty(),"deleted parent excluded from every operation");
 check(sql("SELECT deleted_by_user_id FROM gl_budgets WHERE id=$1",{id})[0].value["deleted_by_user_id"]==actor2&&sql("SELECT count(*)::int AS count FROM gl_budget_details WHERE budget_id=$1 AND is_deleted=false",{id})[0].value["count"].asInt()==0,"header delete actor and no live details");
 r=call("create","",input);check(r.success&&r.result["id"]!=id,"soft-deleted schedule can be recreated");
 // Maximum schedule length, broad SQL year bounds and shared tenant cost centers.
 auto wide=input;wide["accountingUnitId"]=unit2;wide["accountId"]=otherAccount;wide["beginDate"]="2027-01-01";wide["endDate"]="2031-12-01";wide["details"]=Json::arrayValue;
 for(int i=0;i<60;i++){Json::Value d;d["year"]=2027+i/12;d["month"]=i%12+1;d["budgetAmount"]="0.000001";d["revisedAmount"]="0";wide["details"].append(d);}
 auto full=call("create","",wide,unit2);check(full.success&&full.result["details"].size()==60,"60-month budget and tenant cost center accepted in another own unit");
 for(int y:{1900,2999}){wide["beginDate"]=std::to_string(y)+"-12-01";wide["endDate"]=wide["beginDate"];wide["costCenterId"]="";wide["details"]=Json::arrayValue;Json::Value d;d["year"]=y;d["month"]=12;d["budgetAmount"]="0";d["revisedAmount"]="0";wide["details"].append(d);auto edge=call("create","",wide,unit2);check(edge.success&&edge.result["costCenterId"].isNull(),"year boundary and empty optional center accepted");}
 sql("UPDATE core_accounting_units SET is_active=false WHERE id=$1 AND is_deleted=false",{unit});check(!call("list").success&&!call("create","",input).success,"inactive unit denied");sql("UPDATE core_accounting_units SET is_active=true,is_deleted=true WHERE id=$1 AND is_deleted=false",{unit});check(!call("list").success&&!call("options").success,"deleted unit denied");
 check(lockVerified,"real competing connection exercised");
 // A rollback must not silently discard retained historical duplicates.
 bool downFailed=false;try{migrate("database/migrations/011_budgets.down.sql");}catch(...){sql("ROLLBACK");downFailed=true;}check(downFailed,"downgrade with recreated periods fails safely");
 // Partially upgraded schemas must also fail safely, including columns not
 // used in list queries but required on later writes. Restoring works immediately.
 for(const auto& col:{"is_deleted","last_modified_at","last_modified_by_user_id","deleted_at","deleted_by_user_id"}){
  sql(std::string("ALTER TABLE gl_budget_details RENAME COLUMN ")+col+" TO missing_column");
  auto pending=call("list");check(!pending.success&&pending.error["code"]=="schema_not_ready","partial migration detected");
  sql(std::string("ALTER TABLE gl_budget_details RENAME COLUMN missing_column TO ")+col);
 }
 sql("DROP INDEX uq_gl_budget_details_live_period");check(call("options").error["code"]=="schema_not_ready","missing live-period index detected");
 sql("CREATE UNIQUE INDEX uq_gl_budget_details_live_period ON gl_budget_details(tenant_id,accounting_unit_id,budget_id,year,month) WHERE is_deleted=false");
 check(call("list","",{},unit2).success,"schema repair takes effect without process restart");
 sql("DROP SCHEMA budget_test CASCADE");PQfinish(db);std::cout<<checks<<" budget PostgreSQL checks passed\n";
}
