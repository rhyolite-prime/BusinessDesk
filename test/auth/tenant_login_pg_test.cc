// Real PostgreSQL tenant lookup + production authentication with mocked user/role ORM.
#include "utils/TenantAuthLookup.h"
#include "domain_services/users/UserService.h"
#include "Tenants.h"
#include "Users.h"
#include <bcrypt.h>

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
using business_desk::domain_services::UserService;
const std::string tenant="10000000-0000-4000-8000-000000000001", actor="20000000-0000-4000-8000-000000000001";
int checks=0;
void check(bool value,const char* label){if(!value)throw std::runtime_error(label);++checks;}
int main(){
 auto* db=PQconnectdb(std::getenv("LOGIN_TEST_DATABASE_URL"));assert(PQstatus(db)==0);
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
 sql("DROP SCHEMA IF EXISTS login_test CASCADE");sql("CREATE SCHEMA login_test");sql("SET search_path TO login_test");
 sql("CREATE TABLE tenants(id uuid PRIMARY KEY,tenancy_name text NOT NULL,name text NOT NULL,is_active boolean NOT NULL DEFAULT true,is_deleted boolean NOT NULL DEFAULT false,require_two_factor_auth boolean NOT NULL DEFAULT false)");
 sql("INSERT INTO tenants(id,tenancy_name,name) VALUES($1,'acme','Acme')",{tenant});
 bool wideFails=false;try{sql("SELECT id,account_version FROM tenants");}catch(const std::exception&){wideFails=true;}check(wideFails,"reproduced missing billing column without migration 018");
 drogon::app().getDbClient()->execute=sql;
 auto found=business_desk::utils::tenant_auth::findActive(drogon::app().getDbClient(),"acme",true).get();check(found&&found->id==tenant&&found->name=="Acme","minimal real SQL lookup succeeds without account_version or subscription columns");
 using drogon_model::BusinessDesk::Users;using drogon_model::BusinessDesk::Tenants;
 // The old generated-model path is deliberately unavailable; no auth code may use it.
 drogon::orm::CoroMapper<Tenants>::failQueries=true;
 Users user;user.setId(actor);user.setTenantId(tenant);user.setUsername("admin");user.setEmail("admin@example.test");user.setPasswordHash(bcrypt::generateHash("test-password",4));user.setIsActive(true);user.setIsDeleted(false);user.setIsLockedOut(false);user.setIsHostAdminUser(false);user.setRoles("[]");user.setUserGroups("[]");drogon::orm::CoroMapper<Users>(0).insert(user).get();
 auto& cfg=drogon::app().config["JwtBearer"];cfg["JwtSecurityKey"]="regression-tests-only";cfg["JwtIssuer"]="tests";cfg["JwtAudience"]="tests";cfg["JwtExpirationTime"]=3600;
 business_desk::dto::SigninDto input;input.setAccountId("acme");input.setUsernameOrEmail("admin");input.setPassword("test-password");UserService service;
 auto login=service.validateTenantUserCredentials(input).get();check(login.success&&login.result["token"].isString(),"password login and token permission resolution survive unrelated model/schema drift");
 input.setPassword("wrong");check(!service.validateTenantUserCredentials(input).get().success,"wrong password still denied");input.setPassword("test-password");
 sql("UPDATE tenants SET is_active=false WHERE id=$1",{tenant});check(!service.validateTenantUserCredentials(input).get().success,"suspended tenant remains denied");sql("UPDATE tenants SET is_active=true,is_deleted=true WHERE id=$1",{tenant});check(!service.validateTenantUserCredentials(input).get().success,"deleted tenant remains denied");sql("UPDATE tenants SET is_deleted=false,require_two_factor_auth=true WHERE id=$1",{tenant});
 auto mfa=service.validateTenantUserCredentials(input).get();check(!mfa.success&&!mfa.result.isMember("token"),"MFA requirement cannot be bypassed by missing TOTP configuration");
 drogon::app().getDbClient()->execute=[](const std::string&,const std::vector<Json::Value>&)->drogon::TestResult{throw drogon::orm::DrogonDbException("private connection details");};check(!service.validateTenantUserCredentials(input).get().success,"real database outage still fails closed");
 std::cout<<checks<<" tenant login PostgreSQL regression checks passed\n";PQfinish(db);
}
