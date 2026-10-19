#include "AccountingUnitService.h"
#include "CoreAccountingUnits.h"
#include "CoreCurrencies.h"
#include "GlAccountGroups.h"
#include "GlAccountControls.h"
#include "GlAccounts.h"
#include "GlAccountBalances.h"
#include "GlAccountingPeriods.h"
#include "GlBankAccounts.h"
#include "utils/TransactionUtil.h"
#include <regex>
namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
using namespace drogon_model::BusinessDesk;
dto::BaseApiResponse fail(const char *code,const char *message) {dto::BaseApiResponse r;r.error["code"]=code;r.error["message"]=message;return r;}
bool uuid(const std::string &id) {static const std::regex pattern("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");return std::regex_match(id,pattern);}
std::string trim(std::string text) {auto first=text.find_first_not_of(" \r\n\t"),last=text.find_last_not_of(" \r\n\t");return first==std::string::npos?std::string{}:text.substr(first,last-first+1);}
Json::Value publicUnit(Json::Value row) {
    Json::Value result;
    for(const auto &[client,db]:std::vector<std::pair<std::string,std::string>>{{"id","id"},{"code","code"},{"name","name"},{"baseCurrencyId","base_currency_id"},{"timeZone","time_zone"},{"fiscalYearStartMonth","fiscal_year_start_month"},{"isActive","is_active"},{"createdAt","created_at"},{"lastModifiedAt","last_modified_at"}})result[client]=row[db];
    return result;
}
template<class Model> drogon::Task<bool> hasLiveRows(DbClientPtr db,const std::string &id) {
    CoroMapper<Model> mapper(db);
    auto criteria=Criteria(Model::Cols::_accounting_unit_id,CompareOperator::EQ,id);
    if constexpr(requires{Model::Cols::_is_deleted;})criteria=criteria && Criteria(Model::Cols::_is_deleted,CompareOperator::EQ,false);
    co_return (co_await mapper.count(criteria))>0;
}
drogon::Task<dto::BaseApiResponse> run(DbClientPtr db,std::string operation,std::string id,Json::Value input,
    int page,int size,std::string query,utils::AuditIdentity identity) {
    GlService service;
    dto::BaseApiResponse result;result.success=true;
    if(operation=="currencies") {
        CoroMapper<CoreCurrencies> currencies(db);
        auto rows=co_await currencies.orderBy(CoreCurrencies::Cols::_code).findBy(Criteria(CoreCurrencies::Cols::_is_deleted,CompareOperator::EQ,false) && Criteria(CoreCurrencies::Cols::_is_active,CompareOperator::EQ,true));
        result.result=Json::arrayValue;
        for(const auto &currency:rows){Json::Value row;row["id"]=currency.getValueOfId();row["code"]=currency.getValueOfCode();row["name"]=currency.getValueOfName();result.result.append(row);}
        co_return result;
    }
    if(operation=="list")co_return co_await service.getAllAccountingUnits(page,size,query,identity,db);
    CoreAccountingUnits unit;
    if(operation!="create") {
        if(!uuid(id))co_return fail("validation_error","Invalid accounting unit UUID.");
        CoroMapper<CoreAccountingUnits> units(db);
        if(operation!="get")units.forUpdate();
        auto rows=co_await units.findBy(Criteria(CoreAccountingUnits::Cols::_id,CompareOperator::EQ,id) &&
            Criteria(CoreAccountingUnits::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId) &&
            Criteria(CoreAccountingUnits::Cols::_is_deleted,CompareOperator::EQ,false));
        if(rows.empty())co_return fail("not_found","Accounting unit not found.");
        unit=rows.front();
        if(operation=="get"){result.result=publicUnit(unit.toJson());co_return result;}
        if(operation=="delete")co_return co_await service.deleteAccountingUnit(id,identity,db);
    }
    if(!input.isObject())co_return fail("validation_error","Expected an accounting unit object.");
    for(const auto &key:input.getMemberNames())if(key!="code"&&key!="name"&&key!="baseCurrencyId"&&key!="timeZone"&&key!="fiscalYearStartMonth"&&key!="isActive")co_return fail("validation_error","Unexpected accounting unit field.");
    for(const auto *key:{"code","name","baseCurrencyId","timeZone"})if(!input[key].isString())co_return fail("validation_error","Accounting unit text fields must be strings.");
    const auto code=trim(input["code"].asString()),name=trim(input["name"].asString()),zone=trim(input["timeZone"].asString());
    if(code.empty()||code.size()>40||name.empty()||name.size()>160||zone.empty()||zone.size()>80||!uuid(input["baseCurrencyId"].asString()) ||
       !input["fiscalYearStartMonth"].isInt()||input["fiscalYearStartMonth"].asInt()<1||input["fiscalYearStartMonth"].asInt()>12||!input["isActive"].isBool())
        co_return fail("validation_error","Provide valid code, name, currency, time zone, fiscal month and active status.");
    // PostgreSQL's zone catalogue is authoritative on the backend, including raw API calls.
    const auto zones=co_await db->execSqlCoro("SELECT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=$1) AS valid",zone);
    if(zones.empty()||!zones[0]["valid"].as<bool>())co_return fail("validation_error","Unknown IANA time zone.");
    if(operation=="update" && unit.getValueOfBaseCurrencyId()!=input["baseCurrencyId"].asString()) {
        bool dependencies=co_await hasLiveRows<GlAccountGroups>(db,id);
        if(!dependencies) dependencies=co_await hasLiveRows<GlAccountControls>(db,id);
        if(!dependencies) dependencies=co_await hasLiveRows<GlAccounts>(db,id);
        if(!dependencies) dependencies=co_await hasLiveRows<GlAccountingPeriods>(db,id);
        if(!dependencies) dependencies=co_await hasLiveRows<GlBankAccounts>(db,id);
        if(!dependencies) dependencies=co_await hasLiveRows<GlAccountBalances>(db,id);
        if(dependencies) co_return fail("conflict","Cannot change base currency after this unit has ledger dependencies.");
    }
    dto::AccountingUnitDto dto;dto.setCode(code);dto.setName(name);dto.setBaseCurrencyId(input["baseCurrencyId"].asString());
    dto.setTimeZone(zone);dto.setFiscalYearStartMonth(input["fiscalYearStartMonth"].asInt());dto.setIsActive(input["isActive"].asBool());
    if(operation=="create") result=co_await service.createAccountingUnit(dto,identity,db);
    else result=co_await service.updateAccountingUnit(dto,id,identity,db);
    if(result.success)result.result=publicUnit(result.result);
    co_return result;
}
}
drogon::Task<dto::BaseApiResponse> AccountingUnitService::execute(std::string operation,std::string id,Json::Value input,
    int pageNo,int pageSize,std::string query,utils::AuditIdentity identity) {
    if(!identity.hasTenant()||!identity.hasUser())co_return fail("unauthorized","Tenant authentication required.");
    try {
        if(operation=="list"||operation=="get"||operation=="currencies")co_return co_await run(drogon::app().getDbClient(),operation,id,input,pageNo,pageSize,query,identity);
        auto tx=co_await drogon::app().getDbClient()->newTransactionCoro();
        auto result=co_await run(tx,operation,id,input,pageNo,pageSize,query,identity);
        if(!result.success){tx->rollback();co_return result;}
        if(!(co_await utils::CommitTransaction{std::move(tx)}))co_return fail("database_error","Unable to commit accounting unit changes.");
        co_return result;
    }catch(const UniqueViolation &){co_return fail("conflict","Accounting unit code already exists.");}
    catch(const std::exception &){co_return fail("database_error","Accounting units service unavailable.");}
}
}
