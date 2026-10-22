// Real PostgreSQL SQL/transaction tests with a synchronous coroutine transport seam.
#include "domain_services/preferences/PreferencesService.h"
#include "domain_services/gl/JournalService.h"
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
using business_desk::domain_services::PreferencesService;
using business_desk::utils::AuditIdentity;
const std::string tenant="10000000-0000-4000-8000-000000000001", other="10000000-0000-4000-8000-000000000002", actor="20000000-0000-4000-8000-000000000001", actor2="20000000-0000-4000-8000-000000000002";
int checks=0;
void check(bool value,const char* label){if(!value)throw std::runtime_error(label);++checks;}
int main(){
 auto* db=PQconnectdb(std::getenv("PREFERENCES_TEST_DATABASE_URL"));assert(PQstatus(db)==0);
 auto sql=[&](const std::string& query,const std::vector<Json::Value>& params=std::vector<Json::Value>{}) {
  if(std::getenv("PREF_DEBUG_SQL"))std::cerr<<query<<std::endl;
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
 sql("SET search_path TO preferences_test");drogon::app().getDbClient()->execute=sql;
 const std::string unit="30000000-0000-4000-8000-000000000001",unitOther="30000000-0000-4000-8000-000000000002",currency="40000000-0000-4000-8000-000000000001";
 sql("INSERT INTO tenants(id,tenancy_name) VALUES($1,'acme'),($2,'other')",{tenant,other});
 auto passwordHash=bcrypt::generateHash("test-reset-password");
 sql("INSERT INTO users(id,tenant_id,first_name,last_name,email,password_hash,is_tenant_admin_user) VALUES($1,$3,'Ada','Mensah','ada@example.test',$4,true),($2,$3,'Regular','User','user@example.test',$4,false)",{actor,actor2,tenant,passwordHash});
 sql("INSERT INTO core_currencies(id,code,name) VALUES($1,'GHS','Ghana cedi')",{currency});
 sql("INSERT INTO core_company_profiles(tenant_id,company_name,email,default_currency_id,created_by_user_id) VALUES($1,'ACME','acme@example.test',$2,$3)",{tenant,currency,actor});
 sql("INSERT INTO core_accounting_units(id,tenant_id,code,name,base_currency_id,is_deleted) VALUES($1,$3,'HQ','Head office',$5,false),($2,$4,'HQ','Other tenant',$5,false)",{unit,unitOther,tenant,other,currency});
 auto call=[&](std::string op,Json::Value body=Json::Value{},AuditIdentity who=AuditIdentity{tenant,actor}){return PreferencesService::execute(op,body,who).get();};
 check(!call("get",{},{}).success,"anonymous preferences rejected");
 sql("ALTER FUNCTION tenant_reset_apply(uuid,uuid,uuid,text) RENAME TO tenant_reset_apply_temporarily_missing");check(call("get").error["code"]=="schema_not_ready","missing migration function fails closed");sql("ALTER FUNCTION tenant_reset_apply_temporarily_missing(uuid,uuid,uuid,text) RENAME TO tenant_reset_apply");
 auto got=call("get");check(got.success&&got.result["canManage"].asBool()&&got.result["version"]==0&&got.result["tables"].size()>40,"tenant admin receives defaults and reviewed table catalog");
 check(!call("get",{},{other,actor}).success,"cross-tenant identity rejected");
 auto regular=call("get",{},{tenant,actor2});check(regular.success&&!regular.result["canManage"].asBool()&&regular.result["tables"].empty(),"regular tenant user reads defaults without reset catalog");
 Json::Value save;save["settings"]=got.result["settings"];save["version"]=0;save["settings"]["locale"]="fr-FR";
 check(!call("save",save,{tenant,actor2}).success,"non-admin preference write forbidden");
 auto saved=call("save",save);check(saved.success&&saved.result["version"]==1,"preferences persist with version and server actor");check(call("save",save).error["code"]=="conflict","stale settings version rejected");
 auto invalid=save;invalid["version"]=1;invalid["settings"]["tenantId"]=other;check(!call("save",invalid).success,"unknown client scope in settings rejected");invalid=save;invalid["settings"]["timeZone"]="not/a/zone";check(!call("save",invalid).success,"invalid time zone rejected");
 check(sql("SELECT count(*)::int AS n FROM core_tenant_preference_events WHERE tenant_id=$1 AND is_deleted=false",{tenant})[0].value["n"]==1,"preference change audit persisted");
 // A real posted journal exercises reset against balances and immutable history.
 const std::string account="50000000-0000-4000-8000-000000000001",account2="50000000-0000-4000-8000-000000000002",period="60000000-0000-4000-8000-000000000001";
 auto group=sql("INSERT INTO gl_account_groups(tenant_id,accounting_unit_id,name,standard_account_type) VALUES($1,$2,'Test group',0) RETURNING id",{tenant,unit})[0].value["id"];
 for(auto a:{account,account2})sql("INSERT INTO gl_accounts(id,tenant_id,accounting_unit_id,account_group_id,account_number,account_name,currency_id,standard_account_type) VALUES($1::uuid,$2,$3,$4,$1::text,'Test account',$5,0)",{a,tenant,unit,group,currency});
 sql("INSERT INTO gl_accounting_periods(id,tenant_id,accounting_unit_id,period,period_start_date,period_end_date) VALUES($1,$2,$3,202610,'2026-10-01','2026-10-31')",{period,tenant,unit});
 Json::Value journal;journal["accountingUnitId"]=unit;journal["batchDate"]="2026-10-22";journal["description"]="Training posting";journal["isMultiCurrency"]=false;journal["lines"]=Json::arrayValue;
 for(int i=0;i<2;i++){Json::Value l;l["accountId"]=i?account2:account;l["currencyId"]=currency;l["exchangeRate"]="1";l["debit"]=i?"0":"12";l["credit"]=i?"12":"0";journal["lines"].append(l);}
 auto draft=business_desk::domain_services::JournalService::execute("create","",unit,journal,{tenant,actor}).get();check(draft.success,"training journal created through production service");Json::Value post;post["accountingUnitId"]=unit;post["periodId"]=period;post["version"]=draft.result["version"];
 check(business_desk::domain_services::JournalService::execute("post",draft.result["id"].asString(),unit,post,{tenant,actor}).get().success,"training journal genuinely posted before reset");
 sql("INSERT INTO roles VALUES(gen_random_uuid(),$1)",{tenant});
 bool lockVerified=false,lockArmed=false;drogon::app().getDbClient()->execute=[&](const std::string& q,const std::vector<Json::Value>& p){auto rows=sql(q,p);if(lockArmed&&!lockVerified&&q.find("SELECT tenant_reset_snapshot(")!=std::string::npos){auto* c=PQconnectdb(std::getenv("PREFERENCES_TEST_DATABASE_URL"));auto* setup=PQexecParams(c,"SET lock_timeout='100ms'",0,nullptr,nullptr,nullptr,nullptr,0);PQclear(setup);const char* u=unit.c_str();auto* locked=PQexecParams(c,"UPDATE preferences_test.core_accounting_units SET name='Concurrent change' WHERE id=$1",1,nullptr,&u,nullptr,nullptr,0);const char* code=PQresultErrorField(locked,'C');bool blocked=code&&std::string(code)=="55P03";PQclear(locked);PQfinish(c);check(blocked,"reset preview locks block concurrent business writes");lockVerified=true;}return rows;};
 sql("INSERT INTO auth_totp_credentials(user_id,tenant_id,encrypted_secret,last_counter) VALUES($1,$2,'encrypted-test-fixture',0)",{actor,tenant});
 auto templateId=sql("INSERT INTO core_system_numbers(tenant_id,module_id,item_name,key,created_by_user_id) VALUES(NULL,1,'Journal','JR',$1) RETURNING id",{actor})[0].value["id"];
 sql("INSERT INTO core_system_numbers(tenant_id,source_template_id,module_id,item_name,key,created_by_user_id) VALUES($1,$2,1,'Journal','JR',$3)",{tenant,templateId,actor});
 Json::Value preview;preview["scope"]="selected";preview["tables"]=Json::arrayValue;preview["tables"].append("core_company_profiles");check(!call("preview",preview).success,"company profile cannot be reset");preview["tables"][0]="users";check(!call("preview",preview).success,"users cannot be reset");preview["tables"][0]="core_currencies";check(!call("preview",preview).success,"global catalog cannot be reset");
 preview["tables"][0]="core_system_numbers";check(!call("preview",preview,{tenant,actor2}).success,"non-admin cannot preview reset");
 lockArmed=true;auto plan=call("preview",preview);if(!plan.success)std::cerr<<plan.toJson()<<std::endl;check(plan.success&&plan.result["confirmation"]=="RESET acme"&&plan.result["items"].size()==1,"selected-table preview issues tenant-bound plan");
 Json::Value reset;reset["planId"]=plan.result["planId"];reset["confirmation"]="RESET acme";reset["password"]="wrong";reset["reason"]="Clear training data";
 sql("UPDATE users SET is_tenant_admin_user=true WHERE id=$1 AND is_deleted=false",{actor2});auto otherAdminReset=reset;otherAdminReset["password"]="test-reset-password";check(call("reset",otherAdminReset,{tenant,actor2}).error["code"]=="conflict","even another administrator cannot use someone else's plan");sql("UPDATE users SET is_tenant_admin_user=false WHERE id=$1 AND is_deleted=false",{actor2});
 check(call("reset",reset).error["code"]=="reauthentication_failed","reset requires fresh correct password");check(sql("SELECT count(*)::int AS n FROM core_accounting_units WHERE tenant_id=$1",{tenant})[0].value["n"]==1,"failed reauthentication does not delete data");
 reset["password"]="test-reset-password";reset["confirmation"]="RESET other";check(!call("reset",reset).success,"wrong typed tenant confirmation rejected");reset["confirmation"]="RESET acme";
 auto done=call("reset",reset);if(!done.success)std::cerr<<done.toJson()<<std::endl;check(done.success&&done.result["deletedRows"]==1,"confirmed selected-table reset commits atomically");check(!call("reset",reset).success,"used plan cannot execute twice");
 auto events=call("history");check(events.success&&events.result["items"].size()>=3&&events.result["items"][0]["actorFullName"]=="Ada Mensah","successful and rejected resets retain scoped actor audit");
 sql("UPDATE core_tenant_reset_auth_limits SET attempts=0 WHERE tenant_id=$1",{tenant});
 preview["tables"][0]="core_accounting_units";plan=call("preview",preview);if(!plan.success)std::cerr<<plan.toJson()<<std::endl;check(plan.success&&plan.result["items"].size()>30,"FK dependencies and financial groups expand before confirmation");
 sql("UPDATE core_accounting_units SET name='Changed after preview' WHERE id=$1 AND is_deleted=false",{unit});reset["planId"]=plan.result["planId"];check(call("reset",reset).error["code"]=="conflict","same-row-count content changes invalidate preview");check(sql("SELECT count(*)::int AS n FROM core_accounting_units WHERE tenant_id=$1",{tenant})[0].value["n"]==1,"stale preview does not partially delete");
 preview["tables"][0]="gl_journal_lines";auto financialPlan=call("preview",preview);check(financialPlan.success&&financialPlan.result["items"].size()>20,"selecting a journal line includes the full financial transaction group");reset["planId"]=financialPlan.result["planId"];
 drogon::TestTransaction::failCommit=true;auto failedCommit=call("reset",reset);drogon::TestTransaction::failCommit=false;check(!failedCommit.success,"reset never reports an unconfirmed commit as successful");check(sql("SELECT count(*)::int AS n FROM gl_account_balances WHERE tenant_id=$1",{tenant})[0].value["n"]==2&&sql("SELECT count(*)::int AS n FROM gl_journal_batches WHERE tenant_id=$1 AND status='posted' AND is_deleted=false",{tenant})[0].value["n"]==1,"failed reset commit rolls back journal and balance deletion together");
 auto expired=call("preview",preview);sql("UPDATE core_tenant_reset_plans SET expires_at=now()-interval '1 minute' WHERE id=$1 AND is_deleted=false",{expired.result["planId"]});reset["planId"]=expired.result["planId"];check(call("reset",reset).error["code"]=="conflict","expired reset token cannot execute");
 reset["planId"]=financialPlan.result["planId"];auto financialReset=call("reset",reset);check(financialReset.success&&sql("SELECT count(*)::int AS n FROM gl_account_balances WHERE tenant_id=$1",{tenant})[0].value["n"]==0&&sql("SELECT count(*)::int AS n FROM gl_journal_lines WHERE tenant_id=$1",{tenant})[0].value["n"]==0,"financial reset clears postings, snapshots and balances consistently");
 check(sql("SELECT count(*)::int AS n FROM gl_accounts WHERE tenant_id=$1 AND is_deleted=false",{tenant})[0].value["n"]==2,"transaction-only reset keeps ledger setup");preview["tables"][0]="core_accounting_units";
 // Unknown tenant tables and unreviewed inbound FKs fail closed.
 sql("CREATE TABLE unreviewed_business(id uuid PRIMARY KEY,tenant_id uuid)");Json::Value all;all["scope"]="all";all["tables"]=Json::arrayValue;check(!call("preview",all).success,"all-tenant reset blocked by unreviewed tenant tables");sql("DROP TABLE unreviewed_business");
 sql("CREATE TABLE preserved_reference(id uuid,unit_id uuid REFERENCES core_accounting_units(id) ON DELETE CASCADE)");check(!call("preview",preview).success,"unreviewed cascading dependent blocks reset");sql("DROP TABLE preserved_reference");
 sql("CREATE FUNCTION test_reset_delete_trigger() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Unexpected delete'; END$$");sql("CREATE TRIGGER unsafe_reset_delete BEFORE DELETE ON core_accounting_units FOR EACH ROW EXECUTE FUNCTION test_reset_delete_trigger()");check(!call("preview",preview).success,"custom delete triggers block destructive initialization");sql("DROP TRIGGER unsafe_reset_delete ON core_accounting_units");sql("DROP FUNCTION test_reset_delete_trigger()");
 sql("ALTER TABLE core_accounting_units ENABLE ROW LEVEL SECURITY");check(!call("preview",preview).success,"unsupported row-security policy blocks reset rather than hiding records");sql("ALTER TABLE core_accounting_units DISABLE ROW LEVEL SECURITY");
 bool protectedRegistry=false;try{sql("INSERT INTO core_tenant_reset_registry VALUES('core_company_profiles','Unsafe','')");}catch(const std::exception&){protectedRegistry=true;}check(protectedRegistry,"registry cannot accidentally enable resetting the company profile");
 // A selected child's reference into this tenant must never cascade another tenant.
 sql("CREATE TABLE cross_child(id uuid PRIMARY KEY,tenant_id uuid,parent_id uuid REFERENCES core_accounting_units(id) ON DELETE CASCADE)");sql("INSERT INTO core_tenant_reset_registry VALUES('cross_child','Test','')");sql("INSERT INTO cross_child VALUES(gen_random_uuid(),$1,$2)",{other,unit});check(!call("preview",preview).success,"cross-tenant cascade reference blocks reset");sql("DROP TABLE cross_child");sql("DELETE FROM core_tenant_reset_registry WHERE table_name='cross_child'");
 sql("CREATE TABLE large_reset_fixture(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL)");sql("INSERT INTO core_tenant_reset_registry VALUES('large_reset_fixture','Test','')");sql("INSERT INTO large_reset_fixture(tenant_id) SELECT $1::uuid FROM generate_series(1,100001)",{tenant});Json::Value tooLarge;tooLarge["scope"]="selected";tooLarge["tables"]=Json::arrayValue;tooLarge["tables"].append("large_reset_fixture");auto largePlan=call("preview",tooLarge);check(!largePlan.success&&largePlan.result["blocked"][0].asString().find("100000")!=std::string::npos,"oversized reset requires operator assistance instead of an unbounded request");sql("DROP TABLE large_reset_fixture");sql("DELETE FROM core_tenant_reset_registry WHERE table_name='large_reset_fixture'");
 auto injected=preview;injected["tables"][0]="users; DROP TABLE users";check(call("preview",injected).error["code"]=="validation_error","client table identifiers cannot inject SQL");injected=preview;injected["tenantId"]=other;check(call("preview",injected).error["code"]=="validation_error","reset scope cannot be supplied by clients");
 // Reset includes archived test business data only; identity/configuration survive.
 const std::string archived="30000000-0000-4000-8000-000000000003";
 sql("INSERT INTO core_accounting_units(id,tenant_id,code,name,base_currency_id,is_deleted) VALUES($1,$2,'OLD','Archived test',$3,true)",{archived,tenant,currency});
 plan=call("preview",all);if(!plan.success)std::cerr<<plan.toJson()<<std::endl;check(plan.success,"whole tenant business preview succeeds");reset["planId"]=plan.result["planId"];long expectedRows=0;for(auto& item:plan.result["items"])expectedRows+=item["rows"].asInt64();auto entire=call("reset",reset);if(!entire.success)std::cerr<<entire.toJson()<<std::endl;check(entire.success&&entire.result["deletedRows"].asInt64()==expectedRows&&expectedRows>=6,"entire reset removes live and archived tenant business data");
 check(sql("SELECT count(*)::int AS n FROM core_accounting_units WHERE tenant_id=$1",{other})[0].value["n"]==1,"other tenant remains untouched");check(sql("SELECT count(*)::int AS n FROM core_company_profiles WHERE tenant_id=$1 AND is_deleted=false",{tenant})[0].value["n"]==1,"company profile retained");check(sql("SELECT count(*)::int AS n FROM users WHERE tenant_id=$1 AND is_deleted=false",{tenant})[0].value["n"]==2,"all users retained");check(call("get").result["settings"]["locale"]=="fr-FR","tenant preferences retained");check(sql("SELECT count(*)::int AS n FROM core_currencies WHERE is_deleted=false")[0].value["n"]==1,"global currency catalog retained");
 check(sql("SELECT count(*)::int AS n FROM core_tenant_reset_events WHERE tenant_id=$1 AND status='completed' AND is_deleted=false",{tenant})[0].value["n"]==3,"completion audit survives whole reset");
 check(sql("SELECT count(*)::int AS n FROM roles WHERE tenant_id=$1",{tenant})[0].value["n"]==1,"role assignments survive tenant initialization");check(lockVerified,"real PostgreSQL contention exercised");
 check(sql("SELECT count(*)::int AS n FROM auth_totp_credentials WHERE tenant_id=$1",{tenant})[0].value["n"]==1,"MFA security configuration survives initialization");check(sql("SELECT count(*)::int AS n FROM core_system_numbers WHERE tenant_id IS NULL AND is_deleted=false")[0].value["n"]==1,"host system-number templates preserved");
 sql("UPDATE users SET is_tenant_admin_user=false WHERE id=$1 AND is_deleted=false",{actor});check(!call("get").result["canManage"].asBool()&&call("preview",all).error["code"]=="forbidden","admin revocation takes effect without trusting stale client permissions");sql("UPDATE users SET is_tenant_admin_user=true WHERE id=$1 AND is_deleted=false",{actor});
 check(sql("SELECT count(*)::int AS n FROM core_tenant_reset_events WHERE details::text LIKE '%test-reset-password%'")[0].value["n"]==0,"reset audit never stores administrator passwords");
 sql("UPDATE core_tenant_reset_auth_limits SET attempts=5 WHERE tenant_id=$1",{tenant});check(call("reset",reset).error["code"]=="rate_limited","reset authentication rate limited independently of plans");
 std::cout<<checks<<" preferences PostgreSQL/service checks passed\n";PQfinish(db);
}
