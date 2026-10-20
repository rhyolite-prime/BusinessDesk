#include "CurrencyService.h"
#include "utils/TransactionUtil.h"
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
#include <algorithm>
#include <regex>
#include <vector>
namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
using namespace drogon_model::BusinessDesk;
dto::BaseApiResponse fail(const char *code,const char *message){dto::BaseApiResponse r;r.error["code"]=code;r.error["message"]=message;return r;}
bool uuid(const std::string &id){static const std::regex p("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");return std::regex_match(id,p);}
std::string trim(std::string s){auto a=s.find_first_not_of(" \t\r\n"),b=s.find_last_not_of(" \t\r\n");return a==std::string::npos?std::string{}:s.substr(a,b-a+1);}
Json::Value publicCurrency(const CoreCurrencies &currency){Json::Value r;r["id"]=currency.getValueOfId();r["code"]=currency.getValueOfCode();r["name"]=currency.getValueOfName();r["decimalPlaces"]=currency.getValueOfDecimalPlaces();r["isActive"]=currency.getValueOfIsActive();return r;}
template<class Model> drogon::Task<bool> referenced(DbClientPtr db,std::vector<std::string> columns,const std::string &id){
    auto scope=Criteria(columns.front(),CompareOperator::EQ,id);
    if constexpr(requires{Model::Cols::_is_deleted;})scope=scope && Criteria(Model::Cols::_is_deleted,CompareOperator::EQ,false);
    CoroMapper<Model> mapper(db);const auto count=co_await mapper.count(scope);co_return count>0;
}
// Named vectors avoid GCC 12 coroutine temporary-argument lifetime issues.
drogon::Task<bool> inUse(DbClientPtr db,std::string id){
    const auto profiles=co_await db->execSqlCoro("SELECT id FROM core_company_profiles WHERE default_currency_id=$1 AND is_deleted=false LIMIT 1",id);
    if(!profiles.empty())co_return true;
    const std::vector<std::string> CoreAccountingUnitsColumns{CoreAccountingUnits::Cols::_base_currency_id};
    if(co_await referenced<CoreAccountingUnits>(db,CoreAccountingUnitsColumns,id))co_return true;
    const std::vector<std::string> CoreCurrencyRatesColumns{CoreCurrencyRates::Cols::_currency_id};
    if(co_await referenced<CoreCurrencyRates>(db,CoreCurrencyRatesColumns,id))co_return true;
    const std::vector<std::string> GlAccountBalancesColumns{GlAccountBalances::Cols::_currency_id};
    if(co_await referenced<GlAccountBalances>(db,GlAccountBalancesColumns,id))co_return true;
    const std::vector<std::string> GlAccountsColumns{GlAccounts::Cols::_currency_id};
    if(co_await referenced<GlAccounts>(db,GlAccountsColumns,id))co_return true;
    const std::vector<std::string> GlBankAccountsColumns{GlBankAccounts::Cols::_currency_id};
    if(co_await referenced<GlBankAccounts>(db,GlBankAccountsColumns,id))co_return true;
    const std::vector<std::string> GlCashReceiptsColumns{GlCashReceipts::Cols::_currency_id};
    if(co_await referenced<GlCashReceipts>(db,GlCashReceiptsColumns,id))co_return true;
    const std::vector<std::string> GlFxRevaluationLinesColumns{GlFxRevaluationLines::Cols::_currency_id};
    if(co_await referenced<GlFxRevaluationLines>(db,GlFxRevaluationLinesColumns,id))co_return true;
    const std::vector<std::string> GlFxRevaluationRunsColumns{GlFxRevaluationRuns::Cols::_currency_id};
    if(co_await referenced<GlFxRevaluationRuns>(db,GlFxRevaluationRunsColumns,id))co_return true;
    const std::vector<std::string> GlImprestRefundsColumns{GlImprestRefunds::Cols::_currency_id};
    if(co_await referenced<GlImprestRefunds>(db,GlImprestRefundsColumns,id))co_return true;
    const std::vector<std::string> GlImprestRetirementsColumns{GlImprestRetirements::Cols::_currency_id};
    if(co_await referenced<GlImprestRetirements>(db,GlImprestRetirementsColumns,id))co_return true;
    const std::vector<std::string> GlImprestWriteOffsColumns{GlImprestWriteOffs::Cols::_currency_id};
    if(co_await referenced<GlImprestWriteOffs>(db,GlImprestWriteOffsColumns,id))co_return true;
    const std::vector<std::string> GlImprestsColumns{GlImprests::Cols::_currency_id};
    if(co_await referenced<GlImprests>(db,GlImprestsColumns,id))co_return true;
    const std::vector<std::string> GlJournalLinesColumns{GlJournalLines::Cols::_currency_id};
    if(co_await referenced<GlJournalLines>(db,GlJournalLinesColumns,id))co_return true;
    const std::vector<std::string> GlPaymentVouchersColumns{GlPaymentVouchers::Cols::_currency_id};
    if(co_await referenced<GlPaymentVouchers>(db,GlPaymentVouchersColumns,id))co_return true;
    const std::vector<std::string> GlPettyCashTransactionsColumns{GlPettyCashTransactions::Cols::_currency_id};
    if(co_await referenced<GlPettyCashTransactions>(db,GlPettyCashTransactionsColumns,id))co_return true;
    co_return false;
}
drogon::Task<dto::BaseApiResponse> scoped(DbClientPtr db,std::string op,std::string id,Json::Value input,int page,int size,std::string query,utils::AuditIdentity identity,bool host){
    dto::BaseApiResponse result;result.success=true;
    if(host){
        // A valid host token alone does not grant catalog administration.
        CoroMapper<Users> users(db);
        auto admins=co_await users.findBy(Criteria(Users::Cols::_id,CompareOperator::EQ,identity.userId) && Criteria(Users::Cols::_is_deleted,CompareOperator::EQ,false) && Criteria(Users::Cols::_is_active,CompareOperator::EQ,true) && Criteria(Users::Cols::_is_host_admin_user,CompareOperator::EQ,true));
        if(admins.empty())co_return fail("forbidden","Host administrator access required.");
        if(op=="session"){result.result["userId"]=identity.userId;result.result["username"]=admins.front().getValueOfUsername();result.result["canManageCurrencies"]=true;co_return result;}
    }
    if(!host && op!="list" && op!="get")co_return fail("forbidden","The shared currency catalog is host-managed.");
    CoroMapper<CoreCurrencies> currencies(db);
    auto live=Criteria(CoreCurrencies::Cols::_is_deleted,CompareOperator::EQ,false);
    if(op=="list"){
        auto search=live;if(!query.empty())search=search && (Criteria(CoreCurrencies::Cols::_code,CompareOperator::Like,"%"+query+"%") || Criteria(CoreCurrencies::Cols::_name,CompareOperator::Like,"%"+query+"%"));
        page=std::clamp(page,1,1000000);size=std::clamp(size,1,200);const auto total=co_await currencies.count(search);
        auto rows=co_await currencies.orderBy(CoreCurrencies::Cols::_code).orderBy(CoreCurrencies::Cols::_id).limit(size).offset(static_cast<size_t>(page-1)*size).findBy(search);
        result.result["data"]=Json::arrayValue;for(const auto &row:rows)result.result["data"].append(publicCurrency(row));
        result.result["totalCount"]=Json::UInt64(total);result.result["pageNo"]=page;result.result["pageSize"]=size;result.result["totalPages"]=Json::UInt64((total+size-1)/size);co_return result;
    }
    CoreCurrencies currency;
    if(op!="create"){
        if(!uuid(id))co_return fail("validation_error","Invalid currency UUID.");
        if(op=="update"||op=="delete")currencies.forUpdate();
        auto rows=co_await currencies.findBy(live && Criteria(CoreCurrencies::Cols::_id,CompareOperator::EQ,id));
        if(rows.empty())co_return fail("not_found","Currency not found.");currency=rows.front();
    }
    if(op=="get"){result.result=publicCurrency(currency);co_return result;}
    if(op=="delete"){
        const bool used=co_await inUse(db,id);
        if(used)co_return fail("conflict","Currency is referenced by accounting units or financial records.");
        currency.setIsDeleted(true);currency.setIsActive(false);utils::applyUpdateAudit(currency,identity);utils::applyDeleteAudit(currency,identity);co_await currencies.update(currency);
        result.result["id"]=id;result.result["deleted"]=true;co_return result;
    }
    if(!input.isObject())co_return fail("validation_error","Expected a currency object.");
    for(const auto &key:input.getMemberNames())if(key!="code"&&key!="name"&&key!="decimalPlaces"&&key!="isActive")co_return fail("validation_error","Unexpected currency field.");
    if(!input["code"].isString()||!input["name"].isString()||!input["decimalPlaces"].isInt()||input["decimalPlaces"].asInt()<0||input["decimalPlaces"].asInt()>6||!input["isActive"].isBool())co_return fail("validation_error","Provide code, name, decimal places (0–6) and boolean status.");
    auto code=trim(input["code"].asString());const auto name=trim(input["name"].asString());
    for(auto &c:code)if(c>='a'&&c<='z')c=static_cast<char>(c-'a'+'A');
    if(code.size()!=3||code.find_first_not_of("ABCDEFGHIJKLMNOPQRSTUVWXYZ")!=std::string::npos||name.empty()||name.size()>100)co_return fail("validation_error","Code must contain three letters and name 1–100 bytes.");
    auto duplicates=co_await currencies.findBy(live && Criteria(CoreCurrencies::Cols::_code,CompareOperator::EQ,code));
    for(const auto &other:duplicates)if(other.getValueOfId()!=id)co_return fail("conflict","Currency code is already in use.");
    if(op=="update") {
        const bool classificationChanged=currency.getValueOfCode()!=code || currency.getValueOfDecimalPlaces()!=input["decimalPlaces"].asInt();
        const bool deactivating=currency.getValueOfIsActive() && !input["isActive"].asBool();
        if(classificationChanged || deactivating) {
            const auto used=co_await inUse(db,id);
            if(used)co_return fail("conflict","Used currencies cannot change code/precision or be deactivated.");
        }
    }
    currency.setCode(code);currency.setName(name);currency.setDecimalPlaces(static_cast<short>(input["decimalPlaces"].asInt()));currency.setIsActive(input["isActive"].asBool());
    if(op=="create"){currency.setIsDeleted(false);utils::applyCreateAudit(currency,identity);currency=co_await currencies.insert(currency);}
    else{utils::applyUpdateAudit(currency,identity);co_await currencies.update(currency);}
    result.result=publicCurrency(currency);co_return result;
}
}
drogon::Task<dto::BaseApiResponse> CurrencyService::execute(std::string op,std::string id,Json::Value input,int page,int size,std::string query,utils::AuditIdentity identity,bool host){
    if(!identity.hasUser() || (host?identity.hasTenant():!identity.hasTenant()))co_return fail("unauthorized","Authentication with the correct scope is required.");
    if(op!="list"&&op!="get"&&op!="create"&&op!="update"&&op!="delete"&&op!="session")co_return fail("validation_error","Unknown currency operation.");
    try{
        if(op=="list"||op=="get"||op=="session")co_return co_await scoped(drogon::app().getDbClient(),op,id,input,page,size,query,identity,host);
        if(!host)co_return fail("forbidden","Only host administrators can manage global currencies.");
        auto tx=co_await drogon::app().getDbClient()->newTransactionCoro();auto result=co_await scoped(tx,op,id,input,page,size,query,identity,host);
        if(!result.success){tx->rollback();co_return result;}
        if(!(co_await utils::CommitTransaction{std::move(tx)}))co_return fail("database_error","Unable to commit currency changes.");co_return result;
    }catch(const UniqueViolation &){co_return fail("conflict","Currency code is reserved, including deleted currencies.");}
    catch(const std::exception &){co_return fail("database_error","Currency service unavailable.");}
}
}
