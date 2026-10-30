#include "domain_services/gl/AccountingUnitService.h"
#include "CoreAccountingUnits.h"
#include "CoreCurrencies.h"
#include "GlAccountGroups.h"
#include "GlAccountControls.h"
#include "GlAccounts.h"
#include "GlAccountingPeriods.h"
#include "GlBankAccounts.h"
#include "GlAccountBalances.h"
using namespace business_desk;
using namespace drogon_model::BusinessDesk;
using namespace drogon::orm;
extern void check(bool,const char*);
void checkAccountingUnits() {
    CoroMapper<CoreAccountingUnits>::rows.clear();CoroMapper<CoreCurrencies>::rows.clear();
    CoroMapper<GlAccountGroups>::rows.clear();CoroMapper<GlAccountControls>::rows.clear();CoroMapper<GlAccounts>::rows.clear();
    CoroMapper<GlAccountingPeriods>::rows.clear();CoroMapper<GlBankAccounts>::rows.clear();CoroMapper<GlAccountBalances>::rows.clear();
    const std::string id="a0000000-0000-4000-8000-000000000001",currencyId="a0000000-0000-4000-8000-000000000002";
    drogon::app().db->execute=[](const auto &sql,const auto &params){Json::Value row;row["valid"]=params[0].asString()=="Africa/Accra";return drogon::TestResult{{row}};};
    CoreCurrencies currency;currency.setId(currencyId);currency.setCode("GHS");currency.setName("Ghana cedi");currency.setIsActive(true);currency.setIsDeleted(false);CoroMapper<CoreCurrencies>(0).insert(currency).get();
    Json::Value input;input["code"]=" HQ ";input["name"]=" Head office ";input["baseCurrencyId"]=currencyId;input["timeZone"]="Africa/Accra";input["fiscalYearStartMonth"]=1;input["isActive"]=true;
    auto run=[&](std::string op,std::string target="",utils::AuditIdentity who={"tenant-a","user-a"},std::string query=""){return domain_services::AccountingUnitService::execute(op,target,input,1,20,query,who).get();};
    check(!run("list","",{}).success,"anonymous unit access denied");
    check(run("currencies").result.size()==1,"live active currency choices");
    currency.setIsDeleted(true);CoroMapper<CoreCurrencies>(0).update(currency).get();
    check(run("currencies").result.empty()&&!run("create").success,"deleted currency neither shown nor accepted");
    currency.setIsDeleted(false);CoroMapper<CoreCurrencies>(0).update(currency).get();
    auto made=run("create");check(made.success&&made.result["name"].asString()=="Head office","create unit with trimmed fields");
    auto unit=CoroMapper<CoreAccountingUnits>(0).findByPrimaryKey(made.result["id"].asString()).get();
    check(unit.getValueOfTenantId()=="tenant-a"&&unit.getValueOfCreatedByUserId()=="user-a","create stamps tenant and actor");
    // The mock generates non-UUID IDs; give the persisted fixture a real API UUID.
    CoroMapper<CoreAccountingUnits>::rows.clear();unit.setId(id);CoroMapper<CoreAccountingUnits>(0).insert(unit).get();
    check(!run("create").success,"duplicate code rejected within tenant");
    check(run("create","",{"tenant-b","user-b"}).success,"different tenant can reuse code");
    check(run("list").result["totalCount"].asInt()==1,"unit list excludes foreign tenant");
    check(run("list","",{"tenant-a","user-a"},"missing").result["totalCount"].asInt()==0,"unit server search");
    check(run("get",id).result["baseCurrencyId"].asString()==currencyId,"detail camelCase currency");
    for(auto op:{"get","update","delete"})check(!run(op,id,{"tenant-b","user-b"}).success,"foreign tenant unit operation rejected");
    check(!run("get","bad-id").success,"malformed UUID rejected");
    input["tenantId"]="forged";check(!run("update",id).success,"client identity fields rejected");input.removeMember("tenantId");
    input["fiscalYearStartMonth"]=13;check(!run("update",id).success,"invalid fiscal month rejected");input["fiscalYearStartMonth"]=1;
    input["isActive"]="false";check(!run("update",id).success,"string boolean rejected");input["isActive"]=false;
    input["timeZone"]="Mars/Invalid";check(!run("update",id).success,"raw API invalid timezone rejected");input["timeZone"]="Africa/Accra";
    input["name"]="Renamed";check(run("update",id).success&&!run("get",id).result["isActive"].asBool(),"edit and deactivate persist");
    auto saved=CoroMapper<CoreAccountingUnits>(0).findByPrimaryKey(id).get();check(saved.getValueOfLastModifiedByUserId()=="user-a","update audit actor");
    GlAccountGroups group;group.setId("dependency");group.setAccountingUnitId(id);group.setIsDeleted(false);CoroMapper<GlAccountGroups>(0).insert(group).get();
    check(!run("delete",id).success,"live account head prevents deleting unit");
    input["baseCurrencyId"]="a0000000-0000-4000-8000-000000000003";check(!run("update",id).success,"ledger dependency blocks base currency change");input["baseCurrencyId"]=currencyId;
    group.setIsDeleted(true);CoroMapper<GlAccountGroups>(0).update(group).get();
    check(run("delete",id).success,"soft-deleted dependencies do not block unit delete");
    saved=CoroMapper<CoreAccountingUnits>(0).findByPrimaryKey(id).get();check(saved.getValueOfIsDeleted()&&!saved.getValueOfIsActive()&&saved.getValueOfDeletedByUserId()=="user-a","unit soft delete and audit persist");
    for(auto op:{"get","update","delete"})check(!run(op,id).success,"deleted units excluded from operations");
    check(run("list").result["totalCount"].asInt()==0,"deleted units excluded from list");
    input["code"]="NEW";drogon::TestTransaction::failCommit=true;check(!run("create").success,"unit commit failure never reports success");drogon::TestTransaction::failCommit=false;
    CoroMapper<CoreAccountingUnits>::failQueries=true;auto failed=run("list");check(!failed.success&&failed.toJson().toStyledString().find("private-db-detail")==std::string::npos,"unit database errors sanitized");CoroMapper<CoreAccountingUnits>::failQueries=false;
    drogon::app().db->execute={};
}
