// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport seam.
#include "domain_services/gl/BankAccountService.h"
#include <drogon/orm/CoroMapper.h>
#include <cassert>
#include "domain_services/shared/BankService.h"
#include "domain_services/gl/DefaultGlNumberService.h"
#include "dto/BankAccountFields.h"
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
using business_desk::domain_services::BankAccountService;
using business_desk::utils::AuditIdentity;
const std::string tenant="10000000-0000-4000-8000-000000000001", other="10000000-0000-4000-8000-000000000002", actor="20000000-0000-4000-8000-000000000001", actor2="20000000-0000-4000-8000-000000000002";
int checks=0;
void check(bool value,const char* label){if(!value)throw std::runtime_error(label);++checks;}
int main(){
 auto* db=PQconnectdb(std::getenv("BANK_ACCOUNT_TEST_DATABASE_URL"));assert(PQstatus(db)==0);
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
 sql("DROP SCHEMA IF EXISTS bank_account_test CASCADE");sql("CREATE SCHEMA bank_account_test");sql("SET search_path TO bank_account_test");
 sql("CREATE TABLE tenants(id uuid PRIMARY KEY)");sql("CREATE TABLE users(id uuid PRIMARY KEY)");
 auto migrate=[&](const char* path){std::ifstream file(path);std::string line,clean;while(std::getline(file,line))if(line.find_first_not_of(" \t")!=std::string::npos&&!line.substr(line.find_first_not_of(" \t")).starts_with("--"))clean+=line+"\n";std::stringstream statements(clean);std::string statement;while(std::getline(statements,statement,';'))if(statement.find_first_not_of(" \n\r\t")!=std::string::npos)sql(statement);};
 migrate("database/migrations/001_create_ledger_schema.sql");migrate("database/migrations/005_banks_and_branches.sql");migrate("database/migrations/009_default_gl_numbers.sql");migrate("database/migrations/010_bank_accounts.sql");
 sql("INSERT INTO tenants VALUES($1),($2)",{tenant,other});sql("INSERT INTO users VALUES($1),($2)",{actor,actor2});
 const std::string unit="30000000-0000-4000-8000-000000000001",unit2="30000000-0000-4000-8000-000000000002",foreign="30000000-0000-4000-8000-000000000003",currency="40000000-0000-4000-8000-000000000001";
 sql("INSERT INTO core_currencies(id,code,name) VALUES($1,'GHS','Cedi')",{currency});
 for(auto [id,t]:std::vector<std::pair<std::string,std::string>>{{unit,tenant},{unit2,tenant},{foreign,other}})sql("INSERT INTO core_accounting_units(id,tenant_id,code,name,base_currency_id) VALUES($1,$2,$4,'Unit',$3)",{id,t,currency,id});
 const std::string account="50000000-0000-4000-8000-000000000001",bank="60000000-0000-4000-8000-000000000001",category="70000000-0000-4000-8000-000000000001",otherAccount="50000000-0000-4000-8000-000000000002",foreignAccount="50000000-0000-4000-8000-000000000003";
 for(auto [u,t,a]:std::vector<std::tuple<std::string,std::string,std::string>>{{unit,tenant,account},{unit2,tenant,otherAccount},{foreign,other,foreignAccount}}){
  auto group=sql("INSERT INTO gl_account_groups(tenant_id,accounting_unit_id,name,standard_account_type) VALUES($1,$2,'Assets',0) RETURNING id",{t,u})[0].value["id"];
  sql("INSERT INTO gl_accounts(id,tenant_id,accounting_unit_id,account_group_id,account_number,account_name,standard_account_type) VALUES($1,$2,$3,$4,'100','Cash',0)",{a,t,u,group});
 }
 const std::string bankA="80000000-0000-4000-8000-000000000001",bankB="80000000-0000-4000-8000-000000000002",branchA="90000000-0000-4000-8000-000000000001",branchB="90000000-0000-4000-8000-000000000002";
 for(auto b:{bankA,bankB})sql("INSERT INTO core_banks(id,tenant_id,name,bank_code,created_by_user_id) VALUES($1,$2,'Bank',$4,$3)",{b,tenant,actor,b});
 for(auto [b,br]:std::vector<std::pair<std::string,std::string>>{{bankA,branchA},{bankB,branchB}})sql("INSERT INTO core_bank_branches(id,tenant_id,bank_id,name,created_by_user_id) VALUES($1,$2,$3,'Accra',$4)",{br,tenant,b,actor});
 bool lockVerified=false;
 drogon::app().getDbClient()->execute=[&](const std::string& q,const std::vector<Json::Value>& params){auto result=sql(q,params);
  if(!lockVerified&&q.find("core_accounting_units")!=std::string::npos&&q.find("FOR UPDATE")!=std::string::npos){auto* competitor=PQconnectdb(std::getenv("BANK_ACCOUNT_TEST_DATABASE_URL"));assert(PQstatus(competitor)==0);const char* value=unit.c_str();auto* locked=PQexecParams(competitor,"SELECT id FROM bank_account_test.core_accounting_units WHERE id=$1 FOR UPDATE NOWAIT",1,nullptr,&value,nullptr,nullptr,0);const char* code=PQresultErrorField(locked,'C');check(code&&std::string(code)=="55P03","unit lock serializes bank and Default GL writes");PQclear(locked);PQfinish(competitor);lockVerified=true;}
  return result;
 };
 auto call=[&](std::string op,std::string id="",Json::Value body=Json::Value{},std::string u="30000000-0000-4000-8000-000000000001",AuditIdentity who={tenant,actor}){return BankAccountService::execute(op,id,u,body,who).get();};
 check(!call("list","",{},unit,{}).success,"anonymous denied");check(!call("list","",{},unit,{"",actor}).success,"host denied");check(!call("list","",{},foreign).success,"foreign unit denied");check(!call("list","",{},"bad").success,"invalid unit rejected");
 auto opts=call("options");check(opts.success&&opts.result["banks"].size()==2&&opts.result["branches"].size()==2&&opts.result["accounts"].size()==1&&opts.result["currencies"].size()==1,"all real lookup types scoped");check(call("list").result["data"].empty(),"initial empty list");
 Json::Value input;input["accountingUnitId"]=unit;input["bankId"]=bankA;input["bankBranchId"]=branchA;input["accountId"]=account;input["currencyId"]=currency;input["accountNumber"]=" AbC-001 ";input["accountType"]="Current";input["dateOpened"]="2024-02-29";input["contactNumber"]="+233 123";

 auto r=call("create","",input);check(r.success,"create persisted bank account");const auto id=r.result["id"].asString();check(r.result["accountNumber"]=="AbC-001"&&r.result["isActive"].asBool(),"normalization and active default");check(r.result["bankName"]=="Bank"&&r.result["bankBranchName"]=="Accra"&&r.result["accountName"]=="Cash"&&r.result["currencyName"]=="Cedi"&&r.result["currencyCode"]=="GHS","display names derived from verified references");
 auto glOptions=business_desk::domain_services::DefaultGlNumberService::execute("options","",unit,{}, {tenant,actor}).get();check(glOptions.success&&glOptions.result["bank"].size()==1&&glOptions.result["bank"][0]["value"]==id,"persisted bank account appears in Default GL lookup");
 check(sql("SELECT created_by_user_id FROM gl_bank_accounts WHERE id=$1",{id})[0].value["created_by_user_id"]==actor,"creation audit");check(call("get",id).success&&call("list").result["data"].size()==1,"read and list");
 auto duplicate=input;duplicate["accountNumber"]="abc-001";check(call("create","",duplicate).error["code"]=="conflict","case-insensitive live number uniqueness");
 Json::Value patch;patch["accountingUnitId"]=unit;patch["address"]="Accra, Ghana";r=call("update",id,patch,unit,{tenant,actor2});check(r.success&&r.result["address"]=="Accra, Ghana"&&r.result["bankId"]==bankA,"partial update preserves fields");check(sql("SELECT last_modified_by_user_id FROM gl_bank_accounts WHERE id=$1",{id})[0].value["last_modified_by_user_id"]==actor2,"update audit");
 for(auto op:{"get","update","delete"}){check(!call(op,id,patch,unit,{other,actor2}).success,"cross-tenant record isolation");check(!call(op,id,patch,unit2).success,"cross-unit record isolation");}
 for(auto key:{"tenantId","id","createdByUserId","isDeleted","bankName","bankBranchName","accountName","currencyName","currencyCode"}){auto bad=patch;bad[key]="forged";check(!call("update",id,bad).success,"scope audit and derived display spoofing rejected");}
 for(auto& f:business_desk::dto::bank_account::fields){auto bad=patch;if(f.limit>0)bad[f.name]=std::string(f.limit+1,'x');else bad[f.name]=std::string(f.type)=="uuid"?"bad-uuid":std::string(f.type)=="date"?"2025-02-29":"true";check(!call("update",id,bad).success,"all model limits/types validated");}
 for(auto d:{"0000-01-01","2024-13-01","2024-04-31","2024-01-01T00:00:00Z",""}){auto bad=patch;bad["dateOpened"]=d;check(!call("update",id,bad).success,"opening date strict calendar validation");}
 auto bad=patch;bad["bankBranchId"]=branchB;check(!call("update",id,bad).success,"branch must belong to selected bank");bad=patch;bad["accountId"]=otherAccount;check(!call("update",id,bad).success,"cross-unit GL rejected");bad["accountId"]=foreignAccount;check(!call("update",id,bad).success,"cross-tenant GL rejected");
 sql("UPDATE core_banks SET is_deleted=true WHERE id=$1",{bankA});check(!call("update",id,patch).success,"deleted bank rejected");sql("UPDATE core_banks SET is_deleted=false WHERE id=$1",{bankA});
 sql("UPDATE core_bank_branches SET is_deleted=true WHERE id=$1",{branchA});check(!call("update",id,patch).success,"deleted branch rejected");sql("UPDATE core_bank_branches SET is_deleted=false WHERE id=$1",{branchA});
 sql("UPDATE gl_accounts SET status='inactive' WHERE id=$1",{account});check(!call("update",id,patch).success,"inactive GL rejected");sql("UPDATE gl_accounts SET status='active' WHERE id=$1",{account});
 sql("UPDATE core_currencies SET is_active=false WHERE id=$1",{currency});check(!call("update",id,patch).success,"inactive currency rejected");sql("UPDATE core_currencies SET is_active=true WHERE id=$1",{currency});
 const std::string usd="40000000-0000-4000-8000-000000000002";sql("INSERT INTO core_currencies(id,code,name) VALUES($1,'USD','Dollar')",{usd});sql("UPDATE gl_accounts SET currency_id=$2 WHERE id=$1",{account,usd});check(!call("update",id,patch).success,"explicit GL currency mismatch rejected");sql("UPDATE gl_accounts SET currency_id=NULL WHERE id=$1",{account});
 auto alias=patch;alias["accountNo"]="AbC-001";alias["contactNo"]="1234";check(call("update",id,alias).success,"C# accountNo/contactNo aliases accepted");alias["accountNumber"]="ambiguous";check(!call("update",id,alias).success,"ambiguous aliases rejected");
 Json::Value defaults;defaults["accountingUnitId"]=unit;defaults["payrollBankAccountId"]=id;
 auto linked=business_desk::domain_services::DefaultGlNumberService::execute("create","",unit,defaults,{tenant,actor}).get();check(linked.success,"Default GL service accepts newly persisted bank account");auto ref=linked.result["id"];

 check(call("delete",id).error["code"]=="conflict","Default GL prevents deletion");bad=patch;bad["isActive"]=false;check(call("update",id,bad).error["code"]=="conflict","Default GL prevents deactivation");bad=patch;bad["accountNumber"]="changed";check(call("update",id,bad).error["code"]=="conflict","used identity immutable");check(call("update",id,patch).success,"used account permits descriptive edits");
 sql("UPDATE gl_default_accounts SET is_deleted=true WHERE id=$1",{ref});
 auto pv=sql("INSERT INTO gl_payment_vouchers(tenant_id,accounting_unit_id,bank_account_id,batch_number,voucher_entry_date,mode_of_payment,currency_id) VALUES($1,$2,$3,'PV','2024-01-01','bank',$4) RETURNING id",{tenant,unit,id,currency})[0].value["id"];
 check(call("delete",id).error["code"]=="conflict","payment voucher blocks deletion");sql("UPDATE gl_payment_vouchers SET is_deleted=true WHERE id=$1",{pv});
 auto cr=sql("INSERT INTO gl_cash_receipts(tenant_id,accounting_unit_id,cash_bank_account_id,receipt_number,receipt_date,currency_id,received_from,payment_method) VALUES($1,$2,$3,'CR','2024-01-01',$4,'Customer','bank') RETURNING id",{tenant,unit,id,currency})[0].value["id"];
 check(call("delete",id).error["code"]=="conflict","cash receipt blocks deletion");sql("UPDATE gl_cash_receipts SET is_deleted=true WHERE id=$1",{cr});
 auto reconciliation=sql("INSERT INTO gl_bank_reconciliations(tenant_id,accounting_unit_id,bank_account_id,statement_number,statement_start_date,statement_end_date,statement_opening_balance,statement_closing_balance,created_by_user_id) VALUES($1,$2,$3,'ST','2024-01-01','2024-01-31',0,0,$4) RETURNING id",{tenant,unit,id,actor})[0].value["id"];
 check(call("delete",id).error["code"]=="conflict","permanent reconciliation history blocks deletion");sql("DELETE FROM gl_bank_reconciliations WHERE id=$1",{reconciliation});
 auto bankDelete=business_desk::domain_services::BankService::execute("delete",false,"",bankA,{},1,20,"",{tenant,actor}).get();check(bankDelete.error["code"]=="conflict","catalog bank deletion blocked by live account");auto branchDelete=business_desk::domain_services::BankService::execute("delete",true,bankA,branchA,{},1,20,"",{tenant,actor}).get();check(branchDelete.error["code"]=="conflict","catalog branch deletion blocked by live account");
 drogon::TestTransaction::failCommit=true;bad=patch;bad["address"]="Must rollback";check(!call("update",id,bad).success,"failed commit reported");drogon::TestTransaction::failCommit=false;check(call("get",id).result["address"]=="Accra, Ghana","commit failure rolls back");
 check(call("delete",id).success,"unused bank account soft delete");auto stored=sql("SELECT * FROM gl_bank_accounts WHERE id=$1",{id})[0].value;check(stored["is_deleted"].asBool()&&!stored["is_active"].asBool()&&stored["deleted_by_user_id"]==actor,"delete audit and active state");check(!call("get",id).success&&!call("update",id,patch).success&&!call("delete",id).success&&call("list").result["data"].empty(),"all operations exclude deleted records");
 glOptions=business_desk::domain_services::DefaultGlNumberService::execute("options","",unit,{}, {tenant,actor}).get();check(glOptions.success&&glOptions.result["bank"].empty(),"deleted bank account excluded from Default GL lookup");
 r=call("create","",input);check(r.success&&r.result["id"]!=id,"number reusable after soft deletion without restoring old ID");
 drogon::app().getDbClient()->execute={};sql("DROP SCHEMA bank_account_test CASCADE");PQfinish(db);std::cout<<checks<<" bank account PostgreSQL checks passed\n";
}
