#include "AccountHeadService.h"
#include "GlAccountGroups.h"
#include "GlAccountControls.h"
#include "GlAccounts.h"
#include "CoreAccountingUnits.h"
#include <drogon/orm/CoroMapper.h>
#include <algorithm>
#include <cctype>
#include <unordered_set>
namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
using namespace drogon_model::BusinessDesk;
dto::BaseApiResponse error(const char *code, const char *message) {
    dto::BaseApiResponse result; result.error["code"]=code; result.error["message"]=message; return result;
}
Json::Value publicHead(const GlAccountGroups &head) {
    Json::Value row;
    row["id"]=head.getValueOfId(); row["name"]=head.getValueOfName();
    row["parentId"]=head.getValueOfParentGroupId().empty()?Json::Value():Json::Value(head.getValueOfParentGroupId());
    row["accountType"]=head.getValueOfStandardAccountType(); row["isActive"]=head.getValueOfIsActive();
    row["accountingUnitId"]=head.getValueOfAccountingUnitId();
    return row;
}
}
static drogon::Task<dto::BaseApiResponse> executeScoped(drogon::orm::DbClientPtr db, std::string operation, std::string id,
    std::string unitId, Json::Value input, int pageNo, int pageSize, std::string query, utils::AuditIdentity identity) {
    if(!identity.hasTenant() || !identity.hasUser()) co_return error("unauthorized","Tenant authentication required.");
    try {
        CoroMapper<CoreAccountingUnits> units(db);
        const auto unitScope=Criteria(CoreAccountingUnits::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId) &&
            Criteria(CoreAccountingUnits::Cols::_is_deleted,CompareOperator::EQ,false) &&
            Criteria(CoreAccountingUnits::Cols::_is_active,CompareOperator::EQ,true);
        dto::BaseApiResponse result; result.success=true;
        if(operation=="units") {
            auto rows=co_await units.orderBy(CoreAccountingUnits::Cols::_id).findBy(unitScope);
            result.result=Json::arrayValue;
            for(const auto &unit:rows) { Json::Value row;row["id"]=unit.getValueOfId();row["name"]=unit.getValueOfName();row["code"]=unit.getValueOfCode();result.result.append(row); }
            co_return result;
        }
        if(unitId.empty()) co_return error("validation_error","Select an accounting unit.");
        // Serialize writes within the unit so concurrent parent changes cannot create cycles.
        if(operation=="create" || operation=="update" || operation=="delete") units.forUpdate();
        auto ownedUnits=co_await units.findBy(unitScope && Criteria(CoreAccountingUnits::Cols::_id,CompareOperator::EQ,unitId));
        if(ownedUnits.empty()) co_return error("not_found","Accounting unit not found or inactive.");
        CoroMapper<GlAccountGroups> heads(db);
        const auto scope=Criteria(GlAccountGroups::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId) &&
            Criteria(GlAccountGroups::Cols::_accounting_unit_id,CompareOperator::EQ,unitId) &&
            Criteria(GlAccountGroups::Cols::_is_deleted,CompareOperator::EQ,false);
        if(operation=="list") {
            auto search=scope;
            if(!query.empty()) search=search && Criteria(GlAccountGroups::Cols::_name,CompareOperator::Like,"%"+query+"%");
            pageNo=std::clamp(pageNo,1,1000000);pageSize=std::clamp(pageSize,1,200);
            auto total=co_await heads.count(search);
            auto rows=co_await heads.orderBy(GlAccountGroups::Cols::_id).limit(pageSize).offset(static_cast<size_t>(pageNo-1)*pageSize).findBy(search);
            result.result["data"]=Json::arrayValue;
            for(const auto &head:rows)result.result["data"].append(publicHead(head));
            result.result["totalCount"]=Json::UInt64(total);result.result["pageNo"]=pageNo;result.result["pageSize"]=pageSize;
            result.result["totalPages"]=Json::UInt64((total+pageSize-1)/pageSize);
            co_return result;
        }
        GlAccountGroups head;
        if(operation!="create") {
            auto rows=co_await heads.findBy(scope && Criteria(GlAccountGroups::Cols::_id,CompareOperator::EQ,id));
            if(rows.empty()) co_return error("not_found","Account head not found.");
            head=rows.front();
        }
        if(operation=="get") {result.result=publicHead(head);co_return result;}
        auto childScope=scope && Criteria(GlAccountGroups::Cols::_parent_group_id,CompareOperator::EQ,id);
        CoroMapper<GlAccountControls> controls(db); CoroMapper<GlAccounts> accounts(db);
        const auto controlsScope=Criteria(GlAccountControls::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId) &&
            Criteria(GlAccountControls::Cols::_accounting_unit_id,CompareOperator::EQ,unitId) &&
            Criteria(GlAccountControls::Cols::_account_group_id,CompareOperator::EQ,id) &&
            Criteria(GlAccountControls::Cols::_is_deleted,CompareOperator::EQ,false);
        const auto accountsScope=Criteria(GlAccounts::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId) &&
            Criteria(GlAccounts::Cols::_accounting_unit_id,CompareOperator::EQ,unitId) &&
            Criteria(GlAccounts::Cols::_account_group_id,CompareOperator::EQ,id) &&
            Criteria(GlAccounts::Cols::_is_deleted,CompareOperator::EQ,false);
        if(operation=="delete") {
            if((co_await heads.count(childScope)) || (co_await controls.count(controlsScope)) || (co_await accounts.count(accountsScope)))
                co_return error("conflict","Remove child heads, controls and accounts before deleting this head.");
            head.setIsDeleted(true);utils::applyDeleteAudit(head,identity);utils::applyUpdateAudit(head,identity);co_await heads.update(head);
            result.result["id"]=id;result.result["deleted"]=true;co_return result;
        }
        if(input.isObject() && input["name"].isString()) {
            auto name=input["name"].asString();
            auto first=name.find_first_not_of(" \t\r\n"), last=name.find_last_not_of(" \t\r\n");
            input["name"]=first==std::string::npos?std::string{}:name.substr(first,last-first+1);
        }
        if(!input.isObject() || !input["name"].isString() || input["name"].asString().empty() || input["name"].asString().size()>160 ||
            !input["accountType"].isInt() || input["accountType"].asInt()<0 || input["accountType"].asInt()>4 ||
            !input["isActive"].isBool() || (!input["parentId"].isNull() && !input["parentId"].isString()))
            co_return error("validation_error","Provide a name, account type (0–4), boolean active status and optional parent ID.");
        const auto parentId=input["parentId"].isString()?input["parentId"].asString():std::string{};
        const int type=input["accountType"].asInt();const bool active=input["isActive"].asBool();
        auto ancestor=parentId;std::unordered_set<std::string> seen;
        while(!ancestor.empty()) {
            if(ancestor==id || !seen.insert(ancestor).second || seen.size()>64)
                co_return error("validation_error","Parent reference creates a cycle or exceeds hierarchy depth.");
            auto parents=co_await heads.findBy(scope && Criteria(GlAccountGroups::Cols::_id,CompareOperator::EQ,ancestor));
            if(parents.empty() || !parents.front().getValueOfIsActive() || parents.front().getValueOfStandardAccountType()!=type)
                co_return error("validation_error","Parent must be an active head of the same type in this accounting unit.");
            ancestor=parents.front().getValueOfParentGroupId();
        }
        // Duplicate checks consider live siblings only; DB constraints arbitrate races.
        const auto siblings=co_await heads.findBy(scope);
        auto lower=[](std::string value){std::transform(value.begin(),value.end(),value.begin(),[](unsigned char c){return static_cast<char>(std::tolower(c));});return value;};
        for(const auto &sibling:siblings) if(sibling.getValueOfId()!=id && sibling.getValueOfParentGroupId()==parentId && lower(sibling.getValueOfName())==lower(input["name"].asString()))
            co_return error("conflict","An account head with this name already exists under this parent.");
        if(operation=="update") {
            if(type!=head.getValueOfStandardAccountType() && ((co_await heads.count(childScope)) || (co_await controls.count(controlsScope)) || (co_await accounts.count(accountsScope))))
                co_return error("conflict","Cannot change account type while this head has dependents.");
            if(!active && head.getValueOfIsActive() &&
               ((co_await heads.count(childScope && Criteria(GlAccountGroups::Cols::_is_active,CompareOperator::EQ,true))) ||
                (co_await controls.count(controlsScope && Criteria(GlAccountControls::Cols::_is_active,CompareOperator::EQ,true))) ||
                (co_await accounts.count(accountsScope && Criteria(GlAccounts::Cols::_status,CompareOperator::EQ,std::string("active"))))))
                co_return error("conflict","Cannot deactivate a head with active dependents.");
        }
        head.setName(input["name"].asString());head.setStandardAccountType(static_cast<short>(type));head.setIsActive(active);
        if(parentId.empty())head.setParentGroupIdToNull();else head.setParentGroupId(parentId);
        if(operation=="create") {head.setAccountingUnitId(unitId);head.setSortOrder(0);head.setIsDeleted(false);utils::applyCreateAudit(head,identity);head=co_await heads.insert(head);}
        else {utils::applyUpdateAudit(head,identity);co_await heads.update(head);}
        result.result=publicHead(head);co_return result;
    } catch(const drogon::orm::UniqueViolation &) {co_return error("conflict","An account head with these details already exists.");}
    catch(const drogon::orm::DrogonDbException &) {co_return error("database_error","Unable to access account heads.");}
}
namespace {
struct CommitUnitWrite {
    std::shared_ptr<drogon::orm::Transaction> transaction;
    bool committed = false;
    bool await_ready() const noexcept { return false; }
    void await_suspend(std::coroutine_handle<> continuation) {
        transaction->setCommitCallback([this, continuation](bool ok) { committed = ok; continuation.resume(); });
        // Release the last transaction owner to trigger Drogon's asynchronous commit.
        transaction.reset();
    }
    bool await_resume() const noexcept { return committed; }
};
}
drogon::Task<dto::BaseApiResponse> AccountHeadService::execute(std::string operation, std::string id,
    std::string unitId, Json::Value input, int pageNo, int pageSize, std::string query, utils::AuditIdentity identity) {
    if (!identity.hasUser() || !identity.hasTenant()) co_return error("unauthorized", "Tenant authentication required.");
    try {
        const bool write = operation=="create" || operation=="update" || operation=="delete";
        if (!write) co_return co_await executeScoped(drogon::app().getDbClient(),operation,id,unitId,input,pageNo,pageSize,query,identity);
        auto transaction = co_await drogon::app().getDbClient()->newTransactionCoro();
        auto result = co_await executeScoped(transaction,operation,id,unitId,input,pageNo,pageSize,query,identity);
        if (!result.success) { transaction->rollback(); co_return result; }
        if (!(co_await CommitUnitWrite{std::move(transaction)}))
            co_return error("database_error", "Unable to commit account-head changes.");
        co_return result;
    } catch (const std::exception &) { co_return error("database_error", "Unable to access account heads."); }
}

}
