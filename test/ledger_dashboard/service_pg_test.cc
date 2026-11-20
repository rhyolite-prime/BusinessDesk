// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport seam.
#include "domain_services/gl/LedgerDashboardService.h"
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
using business_desk::domain_services::LedgerDashboardService;
using business_desk::utils::AuditIdentity;
const std::string tenant="10000000-0000-4000-8000-000000000001", other="10000000-0000-4000-8000-000000000002", actor="20000000-0000-4000-8000-000000000001", actor2="20000000-0000-4000-8000-000000000002";
int checks=0;
void check(bool value,const char* label){if(!value)throw std::runtime_error(label);++checks;}
int main(){
 auto* db=PQconnectdb(std::getenv("DASHBOARD_TEST_DATABASE_URL"));assert(PQstatus(db)==0);
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

 sql("DROP SCHEMA IF EXISTS ledger_dashboard_test CASCADE");
 sql("CREATE SCHEMA ledger_dashboard_test");
 sql("SET search_path TO ledger_dashboard_test");
 sql("CREATE TABLE tenants(id uuid PRIMARY KEY,is_deleted boolean DEFAULT false)");
 sql("CREATE TABLE users(id uuid PRIMARY KEY,tenant_id uuid,is_deleted boolean DEFAULT false,is_active boolean DEFAULT true,is_locked_out boolean DEFAULT false,first_name text,last_name text,username text)");
 auto migrate=[&](const char* path){
  std::ifstream file(path); std::string line,clean;
  while(std::getline(file,line)) if(line.find_first_not_of(" \t")!=std::string::npos && !line.substr(line.find_first_not_of(" \t")).starts_with("--")) clean+=line+"\n";
  std::stringstream statements(clean); std::string statement;
  while(std::getline(statements,statement,';')) if(statement.find_first_not_of(" \n\r\t")!=std::string::npos) sql(statement);
 };
 migrate("database/migrations/001_create_ledger_schema.sql");
 migrate("database/migrations/007_cost_centers.sql");
 migrate("database/migrations/012_journals.sql");
 migrate("database/migrations/014_journal_organization_units.sql");
 sql("INSERT INTO tenants(id) VALUES($1),($2)",{tenant,other});
 sql("INSERT INTO users(id,tenant_id,first_name,last_name,username) VALUES($1,$3,'Ama','Mensah','ama'),($2,$4,'Other','User','other')",{actor,actor2,tenant,other});
 const std::string unit="30000000-0000-4000-8000-000000000001", branch="30000000-0000-4000-8000-000000000002", otherUnit="30000000-0000-4000-8000-000000000003";
 const std::string ghs="40000000-0000-4000-8000-000000000001", usd="40000000-0000-4000-8000-000000000002";
 sql("INSERT INTO core_currencies(id,code,name) VALUES($1,'GHS','Ghana cedi'),($2,'USD','US dollar')",{ghs,usd});
 sql("INSERT INTO core_accounting_units(id,tenant_id,code,name,base_currency_id) VALUES($1,$4,'HQ','Head office',$6),($2,$4,'BR','Branch',$7),($3,$5,'OTHER','Other tenant',$6)",{unit,branch,otherUnit,tenant,other,ghs,usd});
 sql("INSERT INTO core_accounting_units(tenant_id,code,name,base_currency_id,is_active,is_deleted) VALUES($1,'INACTIVE','Inactive unit',$2,false,false),($1,'DELETED','Deleted unit',$2,true,true)",{tenant,ghs});
 auto center=[&](std::string name,Json::Value parent=Json::nullValue,std::string owner=tenant,std::string user=actor){
  return sql("INSERT INTO core_cost_centers(tenant_id,name,parent_id,created_by_user_id) VALUES($1,$2,($3::jsonb->>'id')::uuid,$4) RETURNING id",{owner,name,Json::FastWriter().write([&](){Json::Value p;p["id"]=parent;return p;}()),user})[0].value["id"].asString();
 };
 const auto root=center("Operations"), child=center("Projects",root), otherCenter=center("Private center",Json::nullValue,other,actor2);
 auto group=sql("INSERT INTO gl_account_groups(tenant_id,accounting_unit_id,name,standard_account_type) VALUES($1,$2,'Accounts',0) RETURNING id",{tenant,unit})[0].value["id"];
 int accountNo=1000,batchNo=0;
 auto account=[&](const char* name,int type,std::string currency=""){
  if(currency.empty()) currency=ghs;
  Json::Value a;a["number"]=std::to_string(++accountNo);a["name"]=name;a["type"]=type;
  return sql("INSERT INTO gl_accounts(tenant_id,accounting_unit_id,account_group_id,account_number,account_name,standard_account_type,currency_id) VALUES($1,$2,$3,$4::jsonb->>'number',$4::jsonb->>'name',($4::jsonb->>'type')::smallint,$5) RETURNING id",{tenant,unit,group,Json::FastWriter().write(a),currency})[0].value["id"].asString();
 };
 const auto bank=account("Operating bank",0), foreignBank=account("USD bank",0,usd), revenue=account("Revenue",3), expense=account("Expense",4), liability=account("Payable",1), equity=account("Capital",2), unknown=account("Unknown",-1);
 for(const auto& number:{"001","002","003"}) sql("INSERT INTO gl_bank_accounts(tenant_id,accounting_unit_id,account_id,currency_id,account_number,is_active) VALUES($1,$2,$3,$4,$5::text,$5::text<>'003')",{tenant,unit,bank,ghs,number});
 sql("INSERT INTO gl_bank_accounts(tenant_id,accounting_unit_id,account_id,currency_id,account_number) VALUES($1,$2,$3,$4,'USD1')",{tenant,unit,foreignBank,usd});
 auto batch=[&](const std::string& day,const std::string& status="posted",const std::string& source="general_journal",bool opening=false,std::string selectedUnit="",std::string owner=tenant){
  if(selectedUnit.empty()) selectedUnit=unit;
  Json::Value b;b["day"]=day;b["status"]=status;b["source"]=source;b["opening"]=opening;b["number"]="DASH-"+std::to_string(++batchNo);
  return sql("INSERT INTO gl_journal_batches(tenant_id,accounting_unit_id,batch_number,batch_date,batch_description,status,transaction_source,is_opening_balance,created_by_user_id) VALUES($1,$2,$3::jsonb->>'number',($3::jsonb->>'day')::date,'System transaction',$3::jsonb->>'status',$3::jsonb->>'source',($3::jsonb->>'opening')::boolean,$4) RETURNING id",{owner,selectedUnit,Json::FastWriter().write(b),owner==tenant?actor:actor2})[0].value["id"].asString();
 };
 auto line=[&](const std::string& b,const std::string& a,const std::string& day,const std::string& debit,const std::string& credit,int type,Json::Value cost=Json::nullValue,std::string currency="",std::string transactionDebit="",std::string transactionCredit="",bool opening=false){
  if(currency.empty()) currency=ghs;
  Json::Value l;l["date"]=day;l["debit"]=debit;l["credit"]=credit;l["type"]=type;l["cost"]=cost;l["td"]=transactionDebit.empty()?debit:transactionDebit;l["tc"]=transactionCredit.empty()?credit:transactionCredit;l["opening"]=opening;
  return sql("INSERT INTO gl_journal_lines(tenant_id,accounting_unit_id,journal_batch_id,account_id,account_name,debit_amount,credit_amount,base_debit_amount,base_credit_amount,transaction_date,currency_id,standard_account_type,batch_number,batch_date,organization_unit_id,is_opening_balance) SELECT $1,$2,$3,$4,'Account',($5::jsonb->>'td')::numeric,($5::jsonb->>'tc')::numeric,($5::jsonb->>'debit')::numeric,($5::jsonb->>'credit')::numeric,($5::jsonb->>'date')::date,$6,($5::jsonb->>'type')::smallint,b.batch_number,b.batch_date,($5::jsonb->>'cost')::uuid,($5::jsonb->>'opening')::boolean FROM gl_journal_batches b WHERE b.id=$3 RETURNING id",{tenant,unit,b,a,Json::FastWriter().write(l),currency})[0].value["id"].asString();
 };
 auto sale=[&](std::string day,std::string value,Json::Value cost,std::string source="customer_receipt",bool opening=false){
  const auto b=batch(day,"posted",source,opening);
  line(b,bank,day,value,"0",0,cost);line(b,revenue,day,"0",value,3,cost);return b;
 };
 auto opening=batch("2025-12-31","posted","general_journal",true);
 line(opening,bank,"2025-12-31","1000","0",0,root);line(opening,equity,"2025-12-31","0","1000",2,root);
 sale("2026-09-30","100",root);
 sale("2026-10-01","200.123456",root);
 sale("2026-10-15","50",child);
 auto payment=batch("2026-10-20","posted","supplier_payment");
 line(payment,expense,"2026-10-20","70","0",4,root);line(payment,bank,"2026-10-20","0","70",0,root);
 auto payable=batch("2026-10-22");line(payable,bank,"2026-10-22","30","0",0);line(payable,liability,"2026-10-22","0","30",1);
 auto fx=batch("2026-10-25","posted","customer_receipt");
 line(fx,foreignBank,"2026-10-25","120","0",0,child,usd,"10","0");line(fx,revenue,"2026-10-25","0","120",3,child,usd,"0","10");
 sale("2026-10-01","500",root,"general_journal",true);
 sale("2026-11-01","900",root);
 auto archived=sale("2026-10-31","999999",root);sql("UPDATE gl_journal_batches SET is_deleted=true WHERE id=$1",{archived});
 auto archivedLine=sale("2026-10-30","888888",root);sql("UPDATE gl_journal_lines SET is_deleted=true WHERE journal_batch_id=$1",{archivedLine});sql("UPDATE gl_journal_batches SET is_deleted=true WHERE id=$1",{archivedLine});
 for(const auto& status:{"draft","pending_approval","approved","rejected","voided","reversed"}) {
  auto b=batch("2026-10-29",status);line(b,bank,"2026-10-29","9999","0",0,root);line(b,revenue,"2026-10-29","0","9999",3,root);
 }
 // Unrelated units/tenant records are deliberately present, never aggregated together.
 batch("2026-10-01","draft","other_unit_source",false,branch);
 batch("2026-10-01","draft","private_source",false,otherUnit,other);
 drogon::app().getDbClient()->execute=sql;
 Json::Value defaults;defaults["accountingUnitId"]=unit;defaults["dateFrom"]="2026-10-01";defaults["dateTo"]="2026-10-31";
 auto call=[&](Json::Value filters=Json::nullValue,AuditIdentity who=AuditIdentity{tenant,actor}){return LedgerDashboardService::execute("dashboard",filters.isNull()?defaults:filters,who).get();};
 auto metric=[](const Json::Value& snapshot,const char* key){for(const auto& m:snapshot["metrics"])if(m["key"]==key)return m["amount"].asString();return std::string("missing");};
 auto statusCount=[](const Json::Value& snapshot,const char* status){for(const auto& s:snapshot["journalStatuses"])if(s["status"]==status)return s["count"].asInt();return -1;};
 check(call(Json::nullValue,{}).error["code"]=="unauthorized","anonymous denied");
 check(call(Json::nullValue,{other,actor}).error["code"]=="forbidden","cross-tenant actor denied");
 auto filters=defaults;filters["accountingUnitId"]=otherUnit;check(call(filters).error["code"]=="not_found","cross-tenant unit denied");
 filters=defaults;filters["dateFrom"]="2026-02-30";check(call(filters).error["code"]=="validation_error","real date validation");
 filters=defaults;filters["dateFrom"]="2026-11-01";check(call(filters).error["code"]=="validation_error","reversed dates denied");
 filters=defaults;filters["tenantId"]=other;check(call(filters).error["code"]=="validation_error","scope override denied");
 filters=defaults;filters["status"]="anything";check(call(filters).error["code"]=="validation_error","invalid status denied");
 filters=defaults;filters["includeChildCostCenters"]="false";check(call(filters).error["code"]=="validation_error","child selection is boolean in service contract");
 auto options=LedgerDashboardService::execute("options",Json::Value(Json::objectValue),{tenant,actor}).get();
 check(options.success&&options.result["accountingUnits"].size()==2,"options are live tenant units only");
 check(options.result["costCenters"].size()==2&&options.result["currencies"].size()==2,"real hierarchical centers and transaction currencies");
 check(options.result["sources"].size()==4,"real tenant sources exclude another tenant's source");
 auto result=call();if(!result.success)std::cerr<<result.toJson()<<std::endl;
 check(result.success,"real database dashboard snapshot");auto snapshot=result.result;
 check(metric(snapshot,"assets")=="1930.123456","all-time assets include opening and prior-period history");
 check(metric(snapshot,"liabilities")=="30.000000","liabilities are credit-normal");
 check(metric(snapshot,"revenue")=="370.123456","period revenue excludes opening, future, deleted and non-posted entries");
 check(metric(snapshot,"expenditure")=="70.000000","posted period expense is debit-normal");
 check(snapshot["cashPosition"].size()==2&&snapshot["cashPosition"][0]["amount"]=="1810.123456"&&snapshot["cashPosition"][1]["amount"]=="10.000000","linked cash is in native currencies and duplicate bank links never double count");
 check(snapshot["postedLineCount"]==16&&snapshot["journalCount"]==12&&statusCount(snapshot,"posted")==6,"complete scoped counts, not the latest page");
 check(snapshot["recentJournals"].size()==10&&snapshot["pendingApprovalCount"]==1&&snapshot["pendingJournals"].size()==1,"recent limit is independent of approval totals");
 check(snapshot["recentJournals"][0]["preparer"]=="Ama Mensah"&&!snapshot["asOf"].asString().empty(),"actual preparer and generation timestamp");
 filters=defaults;filters["dateFrom"]="2026-10-16";auto narrowed=call(filters).result;
 check(metric(narrowed,"assets")=="1930.123456"&&metric(narrowed,"revenue")=="120.000000","from date changes period metrics, not closing balances");
 filters=defaults;filters["dateFrom"]="2026-09-01";filters["dateTo"]="2026-09-30";
 check(metric(call(filters).result,"assets")=="1100.000000"&&metric(call(filters).result,"revenue")=="100.000000","through date is inclusive and excludes later lines");
 filters=defaults;filters["costCenterId"]=root;filters["includeChildCostCenters"]=false;
 check(metric(call(filters).result,"assets")=="1730.123456"&&metric(call(filters).result,"revenue")=="200.123456","exact cost center applies to balances and activity");
 filters["includeChildCostCenters"]=true;check(metric(call(filters).result,"assets")=="1900.123456"&&metric(call(filters).result,"revenue")=="370.123456","child cost centers are included on request");
 filters["costCenterId"]="unassigned";check(metric(call(filters).result,"assets")=="30.000000"&&metric(call(filters).result,"liabilities")=="30.000000","unassigned dimension works");
 filters["costCenterId"]=otherCenter;check(call(filters).error["code"]=="not_found","cross-tenant center denied");
 filters=defaults;filters["source"]="supplier_payment";check(metric(call(filters).result,"assets")=="-70.000000"&&metric(call(filters).result,"expenditure")=="70.000000","source filters real posted ledger sources");
 filters=defaults;filters["currencyId"]=usd;auto foreign=call(filters).result;
 check(metric(foreign,"assets")=="120.000000"&&metric(foreign,"revenue")=="120.000000"&&foreign["cashPosition"][0]["amount"]=="10.000000"&&foreign["journalCount"]==1,"transaction currency filter preserves base financial totals and native cash");
 filters["source"]="customer_receipt";filters["costCenterId"]=child;check(metric(call(filters).result,"revenue")=="120.000000","combined dimensional filters");
 filters=defaults;filters["status"]="draft";auto drafts=call(filters).result;
 check(drafts["journalCount"]==1&&statusCount(drafts,"draft")==1&&metric(drafts,"assets")=="1930.123456","status filters activity only, never turns draft amounts into financial totals");
 filters=defaults;filters["accountingUnitId"]=branch;auto empty=call(filters).result;
 check(metric(empty,"assets")=="0.000000"&&empty["accountingUnit"]["baseCurrency"]=="USD"&&empty["cashPosition"].empty(),"empty unit returns zeros in its real base currency, no demo balances");
 sql("UPDATE gl_accounts SET standard_account_type=0 WHERE id=$1",{expense});auto reclassified=call().result;
 check(metric(reclassified,"assets")=="2000.123456"&&metric(reclassified,"expenditure")=="0.000000"&&reclassified["reclassifiedLineCount"]==1,"uses live chart classification consistently with reports and warns");
 sql("UPDATE gl_accounts SET is_deleted=true WHERE id=$1",{expense});check(metric(call().result,"expenditure")=="70.000000","archived GL keeps posted historical classification");sql("UPDATE gl_accounts SET is_deleted=false,standard_account_type=4 WHERE id=$1",{expense});
 auto odd=batch("2026-10-27");line(odd,unknown,"2026-10-27","2","0",-1);line(odd,bank,"2026-10-27","0","2",0);
 check(call().result["unclassifiedLineCount"]==1,"unknown account types surfaced for review");sql("UPDATE gl_journal_batches SET is_deleted=true WHERE id=$1",{odd});
 auto dated=batch("2026-09-28");line(dated,bank,"2026-10-12","1","0",0);line(dated,revenue,"2026-10-12","0","1",3);
 check(metric(call().result,"revenue")=="371.123456"&&call().result["journalCount"]==13,"activity uses transaction dates rather than batch-header date");sql("UPDATE gl_journal_batches SET is_deleted=true WHERE id=$1",{dated});
 auto lineOpening=batch("2026-10-12");line(lineOpening,revenue,"2026-10-12","0","80",3,root,ghs,"0","80",true);
 check(metric(call().result,"revenue")=="370.123456","line opening flag also excluded from income");sql("UPDATE gl_journal_batches SET is_deleted=true WHERE id=$1",{lineOpening});
 // Backlog exceeds both dashboard display limits; counts must remain complete.
 for(int i=0;i<14;i++) { auto b=batch("2026-10-02","pending_approval");line(b,bank,"2026-10-02","1","0",0); }
 for(int i=0;i<12;i++) { auto b=batch("2026-10-31","draft");line(b,bank,"2026-10-31","1","0",0); }
 auto backlog=call().result;
 check(backlog["journalCount"]==38&&backlog["pendingApprovalCount"]==15&&backlog["pendingJournals"].size()==5,"full approval counts are not capped by either display list");
 check(statusCount(backlog,"pending_approval")==15&&backlog["recentJournals"][0]["status"]=="Draft","status mix aggregates beyond latest ten");
 sql("UPDATE users SET is_locked_out=true WHERE id=$1",{actor});check(call().error["code"]=="forbidden","locked tenant user denied");sql("UPDATE users SET is_locked_out=false WHERE id=$1",{actor});
 auto capacity=batch("2026-10-31");
 sql("INSERT INTO gl_journal_lines(tenant_id,accounting_unit_id,journal_batch_id,account_id,account_name,debit_amount,base_debit_amount,transaction_date,currency_id,standard_account_type,batch_number,batch_date) SELECT $1,$2,$3,$4,'Aggregated line',0.000001,0.000001,'2026-10-31',$5,0,'Capacity','2026-10-31' FROM generate_series(1,50001)",{tenant,unit,capacity,bank,ghs});
 auto large=call();check(large.success&&large.result["postedLineCount"]==50017&&metric(large.result,"assets")=="1930.173457","aggregates all rows without the financial extract's 50000-line cap");
 drogon::app().getDbClient()->execute={};
 sql("DROP SCHEMA ledger_dashboard_test CASCADE");PQfinish(db);
 std::cout<<checks<<" ledger dashboard PostgreSQL checks passed\n";
}
