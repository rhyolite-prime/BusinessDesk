#include "domain_services/shared/CurrencyService.h"
#include "CoreCurrencies.h"
#include "Users.h"
#include "CoreAccountingUnits.h"
#include "CoreCurrencyRates.h"
#include "GlAccountBalances.h"
#include "GlAccounts.h"
#include "GlBankAccounts.h"
#include "GlCashReceipts.h"
#include "GlFxRevaluationLines.h"
#include "GlFxRevaluationRuns.h"
#include "GlImprestRefunds.h"
#include "GlImprestRetirements.h"
#include "GlImprestWriteOffs.h"
#include "GlImprests.h"
#include "GlJournalLines.h"
#include "GlPaymentVouchers.h"
#include "GlPettyCashTransactions.h"
using namespace business_desk;
using namespace drogon_model::BusinessDesk;
using namespace drogon::orm;
extern void check(bool,const char*);
void checkCurrencies(){
    rejectEmptyUuidParameters=true;
    CoroMapper<Users>::rows.clear();CoroMapper<CoreCurrencies>::rows.clear();
    Users admin;admin.setId("host-admin");admin.setUsername("admin");admin.setIsActive(true);admin.setIsDeleted(false);admin.setIsHostAdminUser(true);CoroMapper<Users>(0).insert(admin).get();
    Json::Value input;input["code"]=" ghs ";input["name"]=" Ghana cedi ";input["decimalPlaces"]=2;input["isActive"]=true;
    auto run=[&](std::string op,std::string id="",bool host=true,utils::AuditIdentity who={"","host-admin"},std::string query="",int page=1){return domain_services::CurrencyService::execute(op,id,input,page,1,query,who,host).get();};
    check(!run("list","",true,{}).success,"anonymous currency access rejected");
    check(!run("create","",true,{"tenant-a","tenant-admin"}).success,"tenant identity cannot use host scope");
    check(!run("create","",false,{"tenant-a","tenant-admin"}).success,"tenant administrator cannot write global catalog");
    check(!run("session","",false,{"tenant-a","tenant-user"}).success,"tenant cannot obtain host management session");
    check(run("session").result["canManageCurrencies"].asBool(),"host admin session verified from live user row");
    admin.setIsHostAdminUser(false);CoroMapper<Users>(0).update(admin).get();check(run("create").error["code"].asString()=="forbidden","ordinary host user cannot mutate catalog");check(!run("session").success,"ordinary host user cannot obtain admin session");admin.setIsHostAdminUser(true);CoroMapper<Users>(0).update(admin).get();
    auto created=run("create");check(created.success&&created.result["code"].asString()=="GHS"&&created.result["name"].asString()=="Ghana cedi","currency create normalizes code and name");const auto id=created.result["id"].asString();
    auto saved=CoroMapper<CoreCurrencies>(0).findByPrimaryKey(id).get();check(saved.getValueOfCreatedByUserId()=="host-admin"&&!saved.getValueOfIsDeleted(),"currency create audit actor stamped");
    check(run("get",id,false,{"tenant-a","tenant-user"}).success,"tenant can read live global currency");
    check(run("list","",false,{"tenant-b","tenant-user"}).result["totalCount"].asInt()==1,"other tenant reads same shared catalog");
    check(run("list","",true,{"","host-admin"},"missing").result["totalCount"].asInt()==0,"currency server search");
    check(!run("get","bad-uuid").success,"currency UUID validated");
    check(!run("create").success,"duplicate uppercase currency code rejected");
    input["tenantId"]="forged";check(!run("update",id).success,"client tenant or audit fields rejected");input.removeMember("tenantId");
    input["code"]="GH1";check(!run("update",id).success,"nonletter code rejected");input["code"]="GHS";
    input["name"]=" ";check(!run("update",id).success,"blank currency name rejected");input["name"]="Cedi renamed";
    input["decimalPlaces"]=7;check(!run("update",id).success,"currency decimal precision limited to six");input["decimalPlaces"]=1.5;check(!run("update",id).success,"fractional precision rejected");input["decimalPlaces"]=2;
    input["isActive"]="false";check(!run("update",id).success,"string currency status rejected");input["isActive"]=false;
    check(run("update",id).success,"unused currency can be deactivated");check(!run("get",id).result["isActive"].asBool(),"currency inactive state persists");
    check(run("list","",false,{"tenant-a","tenant-user"}).result["totalCount"].asInt()==1,"inactive currencies remain in management view");
    input["isActive"]=true;check(run("update",id).success,"currency can be reactivated");
    saved=CoroMapper<CoreCurrencies>(0).findByPrimaryKey(id).get();check(saved.getValueOfLastModifiedByUserId()=="host-admin","currency update audit actor");
    auto dependency=[&]<class Model>(std::string column){
        CoroMapper<Model>::rows.clear();Model row;row.data["id"]="reference";row.data["tenant_id"]="another-tenant";row.data[column]=id;
        if constexpr(requires{Model::Cols::_is_deleted;})row.data["is_deleted"]=false;
        CoroMapper<Model>(0).insert(row).get();
        check(!run("delete",id).success,"any tenant financial reference blocks global currency deletion");
        input["code"]="USD";check(!run("update",id).success,"used currency code protected");input["code"]="GHS";
        input["decimalPlaces"]=3;check(!run("update",id).success,"used currency precision protected");input["decimalPlaces"]=2;
        input["isActive"]=false;check(!run("update",id).success,"used currency cannot be deactivated");input["isActive"]=true;
        check(run("update",id).success,"used currency name can be updated");
        if constexpr(requires{Model::Cols::_is_deleted;}){
            CoroMapper<Model>::rows[0].data["is_deleted"]=true;input["decimalPlaces"]=3;check(run("update",id).success,"soft-deleted currency reference ignored");input["decimalPlaces"]=2;check(run("update",id).success,"reset precision after deleted reference");
        }
        CoroMapper<Model>::rows.clear();
    };
    dependency.template operator()<CoreAccountingUnits>(CoreAccountingUnits::Cols::_base_currency_id);
    dependency.template operator()<CoreCurrencyRates>(CoreCurrencyRates::Cols::_currency_id);
    dependency.template operator()<GlAccountBalances>(GlAccountBalances::Cols::_currency_id);
    dependency.template operator()<GlAccounts>(GlAccounts::Cols::_currency_id);
    dependency.template operator()<GlBankAccounts>(GlBankAccounts::Cols::_currency_id);
    dependency.template operator()<GlCashReceipts>(GlCashReceipts::Cols::_currency_id);
    dependency.template operator()<GlFxRevaluationLines>(GlFxRevaluationLines::Cols::_currency_id);
    dependency.template operator()<GlFxRevaluationRuns>(GlFxRevaluationRuns::Cols::_currency_id);
    dependency.template operator()<GlImprestRefunds>(GlImprestRefunds::Cols::_currency_id);
    dependency.template operator()<GlImprestRetirements>(GlImprestRetirements::Cols::_currency_id);
    dependency.template operator()<GlImprestWriteOffs>(GlImprestWriteOffs::Cols::_currency_id);
    dependency.template operator()<GlImprests>(GlImprests::Cols::_currency_id);
    dependency.template operator()<GlJournalLines>(GlJournalLines::Cols::_currency_id);
    dependency.template operator()<GlPaymentVouchers>(GlPaymentVouchers::Cols::_currency_id);
    dependency.template operator()<GlPettyCashTransactions>(GlPettyCashTransactions::Cols::_currency_id);
    {
        const auto previous=drogon::app().getDbClient()->execute;
        drogon::app().getDbClient()->execute=[&](const std::string& sql,const std::vector<Json::Value>& params){
            drogon::TestResult rows;
            if(sql.find("core_company_profiles")!=std::string::npos){
                check(sql.find("is_deleted=false")!=std::string::npos&&params[0].asString()==id,"company profile dependency excludes deleted records and binds currency ID");
                Json::Value row;row["id"]="profile";rows.push_back({row});
            }return rows;
        };
        check(!run("delete",id).success,"profile default currency blocks deletion");
        input["isActive"]=false;check(!run("update",id).success,"profile default currency blocks deactivation");input["isActive"]=true;
        input["code"]="USD";check(!run("update",id).success,"profile default currency blocks code changes");input["code"]="GHS";
        input["decimalPlaces"]=3;check(!run("update",id).success,"profile default currency blocks precision changes");input["decimalPlaces"]=2;
        check(run("update",id).success,"profile default currency permits name edits");
        drogon::app().getDbClient()->execute=previous;
    }
    admin.setIsDeleted(true);CoroMapper<Users>(0).update(admin).get();check(!run("update",id).success,"deleted host admin cannot write currencies");admin.setIsDeleted(false);admin.setIsActive(false);CoroMapper<Users>(0).update(admin).get();check(!run("session").success,"inactive host admin cannot obtain session");admin.setIsActive(true);CoroMapper<Users>(0).update(admin).get();
    CoroMapper<CoreCurrencies>::failUniqueWrites=true;check(run("update",id).error["code"].asString()=="conflict","reserved deleted code conflicts sanitized");CoroMapper<CoreCurrencies>::failUniqueWrites=false;
    drogon::TestTransaction::failCommit=true;check(!run("update",id).success,"failed currency commit never reports successful save");drogon::TestTransaction::failCommit=false;
    CoroMapper<CoreCurrencies>::failQueries=true;auto failed=run("list");check(!failed.success&&failed.toJson().toStyledString().find("private-db-detail")==std::string::npos,"currency database errors sanitized");CoroMapper<CoreCurrencies>::failQueries=false;
    check(run("delete",id).success,"unused currency soft delete succeeds");saved=CoroMapper<CoreCurrencies>(0).findByPrimaryKey(id).get();check(saved.getValueOfIsDeleted()&&!saved.getValueOfIsActive()&&saved.getValueOfDeletedByUserId()=="host-admin","currency delete status and audit persisted");
    for(auto op:{"get","update","delete"})check(!run(op,id).success,"deleted currency excluded from reads and writes");
    check(run("list","",false,{"tenant-a","tenant-user"}).result["totalCount"].asInt()==0,"deleted currencies excluded for tenants");
    rejectEmptyUuidParameters=false;
}
