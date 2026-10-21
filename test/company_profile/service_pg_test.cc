// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport seam.
#include "domain_services/shared/CompanyProfileService.h"
#include <drogon/orm/CoroMapper.h>
#include <cassert>
#include "dto/CompanyProfileFields.h"
#include "utils/CompanyProfileSecret.h"
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
using business_desk::domain_services::CompanyProfileService;
using business_desk::utils::AuditIdentity;
const std::string tenant="10000000-0000-4000-8000-000000000001", other="10000000-0000-4000-8000-000000000002", actor="20000000-0000-4000-8000-000000000001", actor2="20000000-0000-4000-8000-000000000002";
int checks=0;
void check(bool value,const char* label){if(!value)throw std::runtime_error(label);++checks;}
int main(){
 auto* db=PQconnectdb(std::getenv("COMPANY_PROFILE_TEST_DATABASE_URL"));assert(PQstatus(db)==0);
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
 sql("DROP SCHEMA IF EXISTS company_profile_test CASCADE");sql("CREATE SCHEMA company_profile_test");sql("SET search_path TO company_profile_test");
 sql("CREATE TABLE tenants(id uuid PRIMARY KEY,is_deleted boolean NOT NULL DEFAULT false)");sql("CREATE TABLE users(id uuid PRIMARY KEY)");sql("CREATE TABLE core_currencies(id uuid PRIMARY KEY,is_deleted boolean DEFAULT false,is_active boolean DEFAULT true)");
 std::ifstream migration("database/migrations/008_company_profiles.sql");std::stringstream source;source<<migration.rdbuf();std::stringstream statements(source.str());std::string statement;while(std::getline(statements,statement,';'))if(statement.find_first_not_of(" \n\r\t")!=std::string::npos)sql(statement);
 sql("INSERT INTO tenants(id) VALUES($1),($2)",{tenant,other});sql("INSERT INTO users(id) VALUES($1),($2)",{actor,actor2});
 const std::string currency="30000000-0000-4000-8000-000000000001";sql("INSERT INTO core_currencies(id) VALUES($1)",{currency});
 bool lockVerified=false;
 drogon::app().getDbClient()->execute=[&](const std::string& query,const std::vector<Json::Value>& params){
  auto result=sql(query,params);
  if(!lockVerified&&query.find("SELECT id FROM tenants")!=std::string::npos){
   auto* competing=PQconnectdb(std::getenv("COMPANY_PROFILE_TEST_DATABASE_URL"));assert(PQstatus(competing)==0);
   const char* value=tenant.c_str();auto* locked=PQexecParams(competing,"SELECT id FROM company_profile_test.tenants WHERE id=$1 FOR UPDATE NOWAIT",1,nullptr,&value,nullptr,nullptr,0);
   const char* code=PQresultErrorField(locked,'C');check(code&&std::string(code)=="55P03","profile mutations lock tenant to serialize creation");PQclear(locked);PQfinish(competing);lockVerified=true;
  }return result;
 };
 auto call=[&](std::string op,Json::Value body=Json::Value{},AuditIdentity who=AuditIdentity{tenant,actor}){return CompanyProfileService::execute(op,body,who).get();};
 check(!call("get",{},{}).success,"anonymous denied");check(!call("get",{},{"",actor}).success,"host cannot impersonate tenant");
 auto r=call("get");check(!r.success&&r.error["code"]=="not_found","missing profile returns 404");
 Json::Value input;input["companyName"]=" Example Company ";input["firstMonthOfFiscalYear"]=4;input["defaultCurrencyId"]=currency;input["socialSecurityFundEmployeeRate"]=5.5;input["socialSecurityFundEmployerRate"]=13;input["paySocialSecurityFund"]=true;input["emailPassword"]="test-only-smtp-password";
 check(!call("update",input).success,"update cannot create missing singleton");check(!call("delete").success,"deletion always forbidden");
 r=call("create",input);check(!r.success&&r.error["code"]=="database_error","SMTP secret fails closed without encryption key");check(!call("get").success,"failed encryption creates no profile");
 drogon::app().config["COMPANY_PROFILE_SMTP_KEY"]=std::string(64,'z');check(!call("create",input).success,"nonhex encryption key fails closed");
 drogon::app().config["COMPANY_PROFILE_SMTP_KEY"]=std::string(64,'a');
 r=call("create",input);check(r.success,"profile create");auto id=r.result["id"].asString();
 check(r.result["companyName"]=="Example Company"&&r.result["firstMonthOfFiscalYear"]==4,"model values normalized and saved");check(r.result["paySocialSecurityFund"].asBool()&&r.result["socialSecurityFundEmployeeRate"]==5.5,"fund rates and booleans persisted");
 check(r.result["hasEmailPassword"].asBool()&&!r.result.isMember("emailPassword")&&r.toJson().toStyledString().find("test-only-smtp-password")==std::string::npos,"public result never contains secret");
 auto cipher=sql("SELECT email_password_encrypted FROM core_company_profiles WHERE tenant_id=$1",{tenant})[0].value["email_password_encrypted"].asString();
 check(cipher.starts_with("v1:")&&cipher.find("test-only-smtp-password")==std::string::npos,"password encrypted at rest");check(business_desk::utils::company_profile_secret::open(cipher,tenant)=="test-only-smtp-password","AES GCM roundtrip");
 check(business_desk::utils::company_profile_secret::seal("test-only-smtp-password",tenant)!=cipher,"same plaintext gets fresh random nonce");
 check(business_desk::utils::company_profile_secret::open(business_desk::utils::company_profile_secret::seal("case-test","A0000000-0000-4000-8000-000000000001"),"a0000000-0000-4000-8000-000000000001")=="case-test","tenant UUID case canonicalized in AAD");
 const auto large=std::string(1024,'x');check(business_desk::utils::company_profile_secret::open(business_desk::utils::company_profile_secret::seal(large,tenant),tenant)==large,"maximum password ciphertext roundtrip");
 drogon::app().config["COMPANY_PROFILE_SMTP_KEY"]=std::string(64,'b');bool wrongKey=false;try{business_desk::utils::company_profile_secret::open(cipher,tenant);}catch(...){wrongKey=true;}check(wrongKey,"wrong key fails authentication");drogon::app().config["COMPANY_PROFILE_SMTP_KEY"]=std::string(64,'a');
 bool wrongTenant=false;try{business_desk::utils::company_profile_secret::open(cipher,other);}catch(...){wrongTenant=true;}check(wrongTenant,"ciphertext bound to tenant");
 bool tampered=false;auto altered=cipher;altered.back()=altered.back()=='a'?'b':'a';try{business_desk::utils::company_profile_secret::open(altered,tenant);}catch(...){tampered=true;}check(tampered,"ciphertext authentication rejects tampering");
 check(sql("SELECT * FROM core_company_profiles WHERE tenant_id=$1",{tenant})[0].value["created_by_user_id"]==actor,"creation audit");
 r=call("create",input);check(!r.success&&r.error["code"]=="conflict","singleton rejects second profile");
 r=call("get",{},{other,actor2});check(!r.success&&r.error["code"]=="not_found","foreign tenant cannot read profile");
 Json::Value second;second["companyName"]="Other Company";second["defaultCurrencyId"]=currency;r=call("create",second,{other,actor2});check(r.success&&r.result["id"]!=id,"each tenant has independent singleton");
 Json::Value patch;patch["cityName"]="Accra";r=call("update",patch,{tenant,actor2});check(r.success&&r.result["cityName"]=="Accra"&&r.result["paySocialSecurityFund"].asBool()&&r.result["socialSecurityFundEmployeeRate"]==5.5,"partial update preserves omitted model fields");
 check(call("get",{},{other,actor2}).result["cityName"]=="","updates tenant isolated");check(sql("SELECT * FROM core_company_profiles WHERE tenant_id=$1",{tenant})[0].value["last_modified_by_user_id"]==actor2,"modification audit");
 patch["emailPassword"]="";check(call("update",patch).success&&sql("SELECT email_password_encrypted FROM core_company_profiles WHERE tenant_id=$1",{tenant})[0].value["email_password_encrypted"]==cipher,"blank password retains ciphertext");
 drogon::app().config.removeMember("COMPANY_PROFILE_SMTP_KEY");check(call("update",patch).success,"unrelated update needs no decryption or key");patch["emailPassword"]="replacement";check(!call("update",patch).success,"password replacement needs key");drogon::app().config["COMPANY_PROFILE_SMTP_KEY"]=std::string(64,'a');
 check(call("update",patch).success,"replace password");auto replacement=sql("SELECT email_password_encrypted FROM core_company_profiles WHERE tenant_id=$1",{tenant})[0].value["email_password_encrypted"].asString();check(replacement!=cipher&&business_desk::utils::company_profile_secret::open(replacement,tenant)=="replacement","new encrypted password persists");
 Json::Value clear;clear["clearEmailPassword"]=true;r=call("update",clear);check(r.success&&!r.result["hasEmailPassword"].asBool(),"explicit clear password");
 clear["emailPassword"]="conflict";check(!call("update",clear).success,"replace and clear rejected together");
 Json::Value invalidSecret;invalidSecret["emailPassword"]=std::string(1025,'x');check(!call("update",invalidSecret).success,"oversized password rejected");invalidSecret["emailPassword"]=123;check(!call("update",invalidSecret).success,"nonstring password rejected");invalidSecret=Json::Value{};invalidSecret["clearEmailPassword"]="true";check(!call("update",invalidSecret).success,"nonboolean clear action rejected");
 for(const auto& field:{"tenantId","id","createdByUserId","isDeleted","hasEmailPassword","email_password_encrypted"}){Json::Value bad;bad[field]="forged";check(!call("update",bad).success,"scope and audit override rejected");}
 for(const auto& f:business_desk::dto::company_profile::fields){
  Json::Value bad;
  if(f.kind=='s')bad[f.name]=std::string(f.limit+1,'x');else if(f.kind=='b')bad[f.name]="true";else if(f.kind=='u')bad[f.name]="bad-id";else if(f.kind=='i')bad[f.name]=f.limit+1;else bad[f.name]=100.01;
  check(!call("update",bad).success,"all model field limits and types validated");
 }
 for(const auto& value:{"bad-email","x@","x y@example.com"}){Json::Value bad;bad["email"]=value;check(!call("update",bad).success,"email validation");}
 Json::Value bad;bad["companyName"]=" ";check(!call("update",bad).success,"company name required");bad=Json::Value{};bad["firstMonthOfFiscalYear"]=0;check(!call("update",bad).success,"fiscal month minimum");bad["firstMonthOfFiscalYear"]=1.5;check(!call("update",bad).success,"fiscal month integer");
 bad=Json::Value{};bad["providentFundEmployeeRate"]=1.1234567;check(!call("update",bad).success,"rates precision limited");bad["providentFundEmployeeRate"]=1.123456;check(call("update",bad).success,"six decimal rate accepted");
 bad=Json::Value{};bad["mailHostName"]="smtp.example.test";check(!call("update",bad).success,"SMTP host needs port and primary address");bad["portNumber"]=587;bad["primaryEmailAddress"]="mail@example.test";check(call("update",bad).success,"SMTP settings accepted");
 bad=Json::Value{};bad["companyLogoUrl"]="javascript:alert(1)";check(!call("update",bad).success,"unsafe logo scheme rejected");bad["companyLogoUrl"]="/logo.png";check(call("update",bad).success,"relative logo URL accepted");
 sql("UPDATE core_currencies SET is_active=false WHERE id=$1",{currency});check(!call("update",Json::Value(Json::objectValue)).success,"inactive currency rejected");sql("UPDATE core_currencies SET is_active=true WHERE id=$1",{currency});
 sql("UPDATE core_currencies SET is_deleted=true WHERE id=$1",{currency});check(!call("update",Json::Value(Json::objectValue)).success,"deleted currency rejected");sql("UPDATE core_currencies SET is_deleted=false WHERE id=$1",{currency});
 Json::Value legacy;legacy["defaultCurrenyId"]=currency;check(call("update",legacy).success,"legacy C# spelling accepted");legacy["defaultCurrencyId"]=currency;check(!call("update",legacy).success,"ambiguous currency aliases rejected");
 legacy.removeMember("defaultCurrenyId");legacy["defaultCurrencyId"]="00000000-0000-0000-0000-000000000000";r=call("update",legacy);check(!r.success,"company local currency cannot be cleared with Guid.Empty");legacy["defaultCurrencyId"]=Json::nullValue;check(!call("update",legacy).success,"company local currency cannot be null");
 drogon::TestTransaction::failCommit=true;Json::Value rollback;rollback["companyName"]="Must not persist";check(!call("update",rollback).success,"commit failure reported");drogon::TestTransaction::failCommit=false;check(call("get").result["companyName"]=="Example Company","failed commit rolled back");
 check(call("delete").error["code"]=="forbidden","no deletion after create");
 sql("UPDATE core_company_profiles SET is_deleted=true WHERE tenant_id=$1",{tenant});check(!call("get").success&&!call("update",patch).success,"deleted records not read or modified");check(!call("create",input).success,"unique tenant constraint reserves singleton even if externally soft deleted");
 sql("DROP SCHEMA company_profile_test CASCADE");drogon::app().getDbClient()->execute={};PQfinish(db);
 std::cout<<checks<<" company profile PostgreSQL/crypto checks passed\n";
}
