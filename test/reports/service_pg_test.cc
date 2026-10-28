// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport seam.
#include "domain_services/reports/FinancialReportService.h"
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
using business_desk::domain_services::FinancialReportService;
using business_desk::utils::AuditIdentity;
const std::string tenant="10000000-0000-4000-8000-000000000001", other="10000000-0000-4000-8000-000000000002", actor="20000000-0000-4000-8000-000000000001", actor2="20000000-0000-4000-8000-000000000002";
int checks=0;
void check(bool value,const char* label){if(!value)throw std::runtime_error(label);++checks;}
int main(){
 auto* db=PQconnectdb(std::getenv("REPORT_TEST_DATABASE_URL"));assert(PQstatus(db)==0);
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

 sql("DROP SCHEMA IF EXISTS financial_report_test CASCADE");sql("CREATE SCHEMA financial_report_test");sql("SET search_path TO financial_report_test");
 sql("CREATE TABLE tenants(id uuid PRIMARY KEY,is_deleted boolean DEFAULT false)");
 sql("CREATE TABLE users(id uuid PRIMARY KEY,tenant_id uuid,is_deleted boolean DEFAULT false,is_active boolean DEFAULT true,is_locked_out boolean DEFAULT false,is_tenant_admin_user boolean DEFAULT false)");
 auto migrate=[&](const char* path){std::ifstream file(path);std::string line,clean;while(std::getline(file,line))if(line.find_first_not_of(" \t")!=std::string::npos&&!line.substr(line.find_first_not_of(" \t")).starts_with("--"))clean+=line+"\n";std::stringstream statements(clean);std::string statement;while(std::getline(statements,statement,';'))if(statement.find_first_not_of(" \n\r\t")!=std::string::npos)sql(statement);};
 sql("CREATE TABLE core_tenant_reset_registry(table_name text PRIMARY KEY,module text,reset_group text)");
 migrate("database/migrations/001_create_ledger_schema.sql");migrate("database/migrations/007_cost_centers.sql");migrate("database/migrations/008_company_profiles.sql");migrate("database/migrations/011_budgets.sql");migrate("database/migrations/012_journals.sql");migrate("database/migrations/014_journal_organization_units.sql");migrate("database/migrations/026_company_display_decimals.sql");migrate("database/migrations/027_financial_report_mappings.sql");migrate("database/migrations/027_financial_report_mappings.down.sql");migrate("database/migrations/027_financial_report_mappings.sql");
 sql("INSERT INTO tenants(id) VALUES($1),($2)",{tenant,other});sql("INSERT INTO users(id,tenant_id,is_tenant_admin_user) VALUES($1,$3,true),($2,$3,false)",{actor,actor2,tenant});
 const std::string unit="30000000-0000-4000-8000-000000000001",unit2="30000000-0000-4000-8000-000000000002",currency="40000000-0000-4000-8000-000000000001";
 sql("INSERT INTO core_currencies(id,code,name) VALUES($1,'GHS','Cedi')",{currency});
 sql("INSERT INTO core_accounting_units(id,tenant_id,code,name,base_currency_id) VALUES($1,$3,'HQ','Head office',$5),($2,$4,'OTHER','Other unit',$5)",{unit,unit2,tenant,other,currency});
 sql("INSERT INTO core_company_profiles(tenant_id,company_name,email,default_currency_id,display_decimals,created_by_user_id) VALUES($1,'Reports tenant','tenant@example.test',$2,4,$3)",{tenant,currency,actor});
 auto group=sql("INSERT INTO gl_account_groups(tenant_id,accounting_unit_id,name,standard_account_type) VALUES($1,$2,'Cash',0) RETURNING id",{tenant,unit})[0].value["id"];
 const auto account=sql("INSERT INTO gl_accounts(tenant_id,accounting_unit_id,account_group_id,account_number,account_name,currency_id,standard_account_type) VALUES($1,$2,$3,'10001','Cash',$4,0) RETURNING id",{tenant,unit,group,currency})[0].value["id"];
 const auto sales=sql("INSERT INTO gl_accounts(tenant_id,accounting_unit_id,account_group_id,account_number,account_name,currency_id,standard_account_type) VALUES($1,$2,$3,'40001','Sales',$4,3) RETURNING id",{tenant,unit,group,currency})[0].value["id"];
 auto batch=sql("INSERT INTO gl_journal_batches(tenant_id,accounting_unit_id,batch_number,batch_date,batch_description,status,transaction_source) VALUES($1,$2,'JV-1','2026-10-01','Posted sale','posted','supplier_payment') RETURNING id",{tenant,unit})[0].value["id"];
 const std::string insertLine="INSERT INTO gl_journal_lines(tenant_id,accounting_unit_id,journal_batch_id,account_id,account_name,debit_amount,credit_amount,base_debit_amount,base_credit_amount,transaction_date,currency_id,currency_code,standard_account_type,batch_number,batch_date) VALUES($1,$2,$3,$4,'Account',($5::jsonb->>'dr')::numeric,($5::jsonb->>'cr')::numeric,($5::jsonb->>'dr')::numeric,($5::jsonb->>'cr')::numeric,($5::jsonb->>'date')::date,$6,'GHS',($5::jsonb->>'type')::smallint,'JV-1','2026-10-01') RETURNING id";
 Json::Value line;line["dr"]="25.123456";line["cr"]="0";line["type"]=0;line["date"]="2026-10-01";
 auto liveLine=sql(insertLine,{tenant,unit,batch,account,Json::FastWriter().write(line),currency})[0].value["id"];
 line["dr"]="0";line["cr"]="25.123456";line["type"]=3;sql(insertLine,{tenant,unit,batch,sales,Json::FastWriter().write(line),currency});
 drogon::app().getDbClient()->execute=sql;
 auto call=[&](Json::Value mappings=Json::Value{},bool write=false,AuditIdentity who=AuditIdentity{tenant,actor},std::string selectedUnit="30000000-0000-4000-8000-000000000001",std::string date="2026-10-31"){return FinancialReportService::execute(selectedUnit,date,mappings,who,write).get();};
 check(!call({},false,{}).success,"anonymous denied");check(!call({},false,{"",actor}).success,"host identity denied");check(!call({},false,{other,actor}).success,"cross-tenant user denied");check(!call({},false,{tenant,actor},unit2).success,"cross-tenant unit denied");check(!call({},false,{tenant,actor},unit,"2026-02-30").success,"real date validation");
 auto r=call();if(!r.success)std::cerr<<r.toJson()<<std::endl;
 check(r.success&&r.result["lines"].size()==2,"all posted sources included");check(r.result["decimals"]==4&&r.result["currencyCode"]=="GHS","profile precision and base currency returned");check(r.result["lines"][0]["debit"]=="25.123456"||r.result["lines"][1]["debit"]=="25.123456","exact decimal strings preserved");check(r.result["canManageMappings"].asBool(),"admin mapping capability");
 check(call({},false,{tenant,actor2}).success&&!call({},false,{tenant,actor2}).result["canManageMappings"].asBool(),"ordinary tenant may read reports");
 sql("UPDATE gl_journal_batches SET status='draft' WHERE id=$1",{batch});check(call().result["lines"].empty(),"draft excluded");sql("UPDATE gl_journal_batches SET status='approved' WHERE id=$1",{batch});check(call().result["lines"].empty(),"unposted approval excluded");sql("UPDATE gl_journal_batches SET status='posted',is_deleted=true WHERE id=$1",{batch});check(call().result["lines"].empty(),"archived batch excluded");sql("UPDATE gl_journal_batches SET is_deleted=false WHERE id=$1",{batch});
 sql("UPDATE gl_journal_lines SET is_deleted=true WHERE id=$1",{liveLine});check(call().result["lines"].size()==1,"archived line excluded");sql("UPDATE gl_journal_lines SET is_deleted=false WHERE id=$1",{liveLine});check(call({},false,{tenant,actor},unit,"2026-09-30").result["lines"].empty(),"through-date limit applied");
 Json::Value mappings(Json::arrayValue),mapping;mapping["accountId"]=account;mapping["category"]="current_asset";mappings.append(mapping);
 check(!call(mappings,true,{tenant,actor2}).success,"mapping write requires admin");check(call(mappings,true).success,"mapping saved");check(call().result["accounts"][0]["category"]=="current_asset","mapping loaded by account UUID");
 mapping["category"]="income_tax";Json::Value invalid(Json::arrayValue);invalid.append(mapping);check(!call(invalid,true).success,"incompatible type classification rejected");
 mapping["category"]="current_asset";mapping["accountId"]="90000000-0000-4000-8000-000000000099";invalid=Json::arrayValue;invalid.append(mapping);check(!call(invalid,true).success,"foreign or missing account rejected");
 invalid=mappings;invalid.append(mappings[0]);check(!call(invalid,true).success,"duplicate account mapping rejected");
 mapping["accountId"]=sales;mapping["category"]="revenue";Json::Value saleMap(Json::arrayValue);saleMap.append(mapping);
 drogon::TestTransaction::failCommit=true;check(!call(saleMap,true).success,"mapping commit failure surfaced");drogon::TestTransaction::failCommit=false;check(sql("SELECT count(*) AS n FROM gl_report_account_mappings WHERE account_id=$1",{sales})[0].value["n"]==0,"mapping failure rolled back");
 check(sql("SELECT count(*) AS n FROM gl_report_mapping_events")[0].value["n"]==1,"mapping audit committed once");
 mappings[0]["category"]="";check(call(mappings,true).success&&call().result["accounts"][0]["category"]=="","unclassify soft deletes mapping");
 sql("UPDATE users SET is_locked_out=true WHERE id=$1",{actor});check(!call().success,"locked user denied");sql("UPDATE users SET is_locked_out=false WHERE id=$1",{actor});
 auto budget=sql("INSERT INTO gl_budgets(tenant_id,accounting_unit_id,account_id,begin_date,end_date,status) VALUES($1,$2,$3,'2026-10-01','2026-10-31','approved') RETURNING id",{tenant,unit,sales})[0].value["id"];
 sql("INSERT INTO gl_budget_details(tenant_id,accounting_unit_id,budget_id,month,year,budget_amount,revised_amount) VALUES($1,$2,$3,10,2026,100,110)",{tenant,unit,budget});check(call().result["budgets"].size()==1,"approved monthly budget included");sql("UPDATE gl_budgets SET status='draft' WHERE id=$1",{budget});check(call().result["budgets"].empty(),"draft budget excluded");
 sql("INSERT INTO gl_journal_lines(tenant_id,accounting_unit_id,journal_batch_id,account_id,account_name,debit_amount,credit_amount,base_debit_amount,base_credit_amount,transaction_date,currency_id,standard_account_type,batch_number,batch_date) SELECT $1,$2,$3,$4,'Capacity test',1,0,1,0,'2026-10-01',$5,0,'JV-1','2026-10-01' FROM generate_series(1,50000)",{tenant,unit,batch,account,currency});check(call().error["code"]=="validation_error","report capacity never silently truncates");
 sql("DROP SCHEMA financial_report_test CASCADE");drogon::app().getDbClient()->execute={};PQfinish(db);std::cout<<checks<<" financial report PostgreSQL checks passed\n";
}
