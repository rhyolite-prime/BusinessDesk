#include "AccountControlService.h"
#include "utils/TransactionUtil.h"
#include "CoreAccountingUnits.h"
#include "GlAccountGroups.h"
#include "GlAccountControls.h"
#include "GlAccounts.h"
#include <algorithm>
#include <cctype>
#include <regex>
#include <unordered_set>
#include <vector>
namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
using namespace drogon_model::BusinessDesk;
dto::BaseApiResponse fail(const char *code,const char *message) {
    dto::BaseApiResponse r;r.error["code"]=code;r.error["message"]=message;return r;
}
bool uuid(const std::string &id) {static const std::regex pattern("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");return std::regex_match(id,pattern);}
std::string lower(std::string text) {std::transform(text.begin(),text.end(),text.begin(),[](unsigned char c){return std::tolower(c);});return text;}
Json::Value publicControl(const GlAccountControls &control) {
    Json::Value row;row["id"]=control.getValueOfId();row["accountingUnitId"]=control.getValueOfAccountingUnitId();
    row["accountGroupId"]=control.getValueOfAccountGroupId();row["accountHeaderName"]=control.getValueOfAccountHeaderName();
    row["parentAccountHeaderId"]=control.getValueOfParentAccountHeaderId().empty()?Json::Value():Json::Value(control.getValueOfParentAccountHeaderId());
    row["minAccount"]=control.getValueOfMinAccount();row["maxAccount"]=control.getValueOfMaxAccount();row["isActive"]=control.getValueOfIsActive();
    return row;
}
drogon::Task<dto::BaseApiResponse> scoped(DbClientPtr db,std::string op,std::string id,std::string unitId,
    Json::Value input,int page,int size,std::string query,utils::AuditIdentity identity) {
    if(!uuid(unitId)|| (op!="create"&&op!="list"&&!uuid(id)))co_return fail("validation_error","Invalid accounting unit or control UUID.");
    CoroMapper<CoreAccountingUnits> units(db);
    if(op=="create"||op=="update"||op=="delete")units.forUpdate();
    auto owned=co_await units.findBy(Criteria(CoreAccountingUnits::Cols::_id,CompareOperator::EQ,unitId) &&
        Criteria(CoreAccountingUnits::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId) &&
        Criteria(CoreAccountingUnits::Cols::_is_deleted,CompareOperator::EQ,false) && Criteria(CoreAccountingUnits::Cols::_is_active,CompareOperator::EQ,true));
    if(owned.empty())co_return fail("not_found","Accounting unit not found or inactive.");
    CoroMapper<GlAccountControls> controls(db);
    const auto scope=Criteria(GlAccountControls::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId) &&
        Criteria(GlAccountControls::Cols::_accounting_unit_id,CompareOperator::EQ,unitId) && Criteria(GlAccountControls::Cols::_is_deleted,CompareOperator::EQ,false);
    dto::BaseApiResponse result;result.success=true;
    if(op=="list") {
        auto search=scope;if(!query.empty())search=search && Criteria(GlAccountControls::Cols::_account_header_name,CompareOperator::Like,"%"+query+"%");
        page=std::clamp(page,1,1000000);size=std::clamp(size,1,200);
        const auto total=co_await controls.count(search);
        const auto rows=co_await controls.orderBy(GlAccountControls::Cols::_id).limit(size).offset(static_cast<size_t>(page-1)*size).findBy(search);
        result.result["data"]=Json::arrayValue;for(const auto &row:rows)result.result["data"].append(publicControl(row));
        result.result["totalCount"]=Json::UInt64(total);result.result["pageNo"]=page;result.result["pageSize"]=size;result.result["totalPages"]=Json::UInt64((total+size-1)/size);
        co_return result;
    }
    GlAccountControls control;
    if(op!="create") {
        auto rows=co_await controls.findBy(scope && Criteria(GlAccountControls::Cols::_id,CompareOperator::EQ,id));
        if(rows.empty())co_return fail("not_found","Account control not found.");control=rows.front();
    }
    if(op=="get"){result.result=publicControl(control);co_return result;}
    CoroMapper<GlAccounts> accounts(db);
    std::vector<GlAccountControls> children;
    std::vector<GlAccounts> linked;
    // A new control has no ID until INSERT assigns one. Only existing controls
    // can have dependents; binding the create path's empty ID to a UUID column
    // makes PostgreSQL reject the query before validation or INSERT can run.
    if(op=="update" || op=="delete") {
        children=co_await controls.findBy(scope && Criteria(GlAccountControls::Cols::_parent_account_header_id,CompareOperator::EQ,id));
        linked=co_await accounts.findBy(Criteria(GlAccounts::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId) &&
            Criteria(GlAccounts::Cols::_accounting_unit_id,CompareOperator::EQ,unitId) && Criteria(GlAccounts::Cols::_is_deleted,CompareOperator::EQ,false) &&
            Criteria(GlAccounts::Cols::_account_header_id,CompareOperator::EQ,id));
    }
    if(op=="delete") {
        if(!children.empty()||!linked.empty())co_return fail("conflict","Remove child controls and accounts before deleting this control.");
        control.setIsDeleted(true);control.setIsActive(false);utils::applyUpdateAudit(control,identity);utils::applyDeleteAudit(control,identity);co_await controls.update(control);
        result.result["id"]=id;result.result["deleted"]=true;co_return result;
    }
    if(!input.isObject())co_return fail("validation_error","Expected a control object.");
    for(const auto &key:input.getMemberNames())if(key!="accountGroupId"&&key!="parentAccountHeaderId"&&key!="accountHeaderName"&&key!="minAccount"&&key!="maxAccount"&&key!="isActive")
        co_return fail("validation_error","Unexpected control field.");
    if(!input["accountGroupId"].isString()||!uuid(input["accountGroupId"].asString())||!input["accountHeaderName"].isString()||
        !input["minAccount"].isInt()||!input["maxAccount"].isInt()||input["minAccount"].asInt()<0||input["maxAccount"].asInt()<input["minAccount"].asInt()||
        !input["isActive"].isBool()||(!input["parentAccountHeaderId"].isNull()&&!input["parentAccountHeaderId"].isString()))
        co_return fail("validation_error","Provide valid head, name, integer range, parent and active status.");
    auto name=input["accountHeaderName"].asString();auto first=name.find_first_not_of(" \t\r\n"),last=name.find_last_not_of(" \t\r\n");
    name=first==std::string::npos?std::string{}:name.substr(first,last-first+1);
    if(name.empty()||name.size()>160)co_return fail("validation_error","Control name must contain 1–160 bytes.");
    const auto group=input["accountGroupId"].asString();const auto parent=input["parentAccountHeaderId"].isString()?input["parentAccountHeaderId"].asString():std::string{};
    if(!parent.empty()&&!uuid(parent))co_return fail("validation_error","Invalid parent UUID.");
    const int min=input["minAccount"].asInt(),max=input["maxAccount"].asInt();const bool active=input["isActive"].asBool();
    CoroMapper<GlAccountGroups> heads(db);
    auto head=co_await heads.findBy(Criteria(GlAccountGroups::Cols::_id,CompareOperator::EQ,group) && Criteria(GlAccountGroups::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId) &&
        Criteria(GlAccountGroups::Cols::_accounting_unit_id,CompareOperator::EQ,unitId) && Criteria(GlAccountGroups::Cols::_is_deleted,CompareOperator::EQ,false) && Criteria(GlAccountGroups::Cols::_is_active,CompareOperator::EQ,true));
    if(head.empty())co_return fail("validation_error","Select an active head in this accounting unit.");
    auto ancestor=parent;std::unordered_set<std::string> seen;
    while(!ancestor.empty()) {
        if(ancestor==id||!seen.insert(ancestor).second||seen.size()>64)co_return fail("validation_error","Control hierarchy creates a cycle or exceeds maximum depth.");
        auto parents=co_await controls.findBy(scope && Criteria(GlAccountControls::Cols::_id,CompareOperator::EQ,ancestor));
        if(parents.empty()||!parents.front().getValueOfIsActive()||parents.front().getValueOfAccountGroupId()!=group)
            co_return fail("validation_error","Parent must be active and belong to the same head and unit.");
        const auto &p=parents.front();
        if(min<p.getValueOfMinAccount()||max>p.getValueOfMaxAccount())co_return fail("validation_error","Range must fit inside its parent range.");
        if(ancestor==parent) {
            const auto count=co_await accounts.count(Criteria(GlAccounts::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId) &&
                Criteria(GlAccounts::Cols::_accounting_unit_id,CompareOperator::EQ,unitId) && Criteria(GlAccounts::Cols::_is_deleted,CompareOperator::EQ,false) && Criteria(GlAccounts::Cols::_account_header_id,CompareOperator::EQ,parent));
            if(count>0)co_return fail("conflict","A control with ledger accounts cannot become a parent.");
        }
        ancestor=p.getValueOfParentAccountHeaderId();
    }
    auto siblings=co_await controls.findBy(scope && Criteria(GlAccountControls::Cols::_account_group_id,CompareOperator::EQ,group));
    for(const auto &sibling:siblings)if(sibling.getValueOfId()!=id&&sibling.getValueOfParentAccountHeaderId()==parent) {
        if(lower(sibling.getValueOfAccountHeaderName())==lower(name))co_return fail("conflict","A sibling control already uses this name.");
        if(min<=sibling.getValueOfMaxAccount()&&max>=sibling.getValueOfMinAccount())co_return fail("conflict","Sibling control number ranges cannot overlap.");
    }
    if(op=="update") {
        if(group!=control.getValueOfAccountGroupId()&&(!children.empty()||!linked.empty()))co_return fail("conflict","Cannot move a control with dependents to another head.");
        for(const auto &child:children) {
            if(child.getValueOfMinAccount()<min||child.getValueOfMaxAccount()>max)co_return fail("conflict","Range must contain existing child controls.");
            if(!active&&child.getValueOfIsActive())co_return fail("conflict","Deactivate child controls first.");
        }
        for(const auto &account:linked) {
            if(!active&&account.getValueOfStatus()=="active")co_return fail("conflict","Deactivate linked accounts first.");
            const auto number=account.getValueOfAccountNumber();
            try {size_t end=0;const auto n=std::stoll(number,&end);if(end!=number.size()||n<min||n>max)co_return fail("conflict","Range must contain existing account numbers.");}
            catch(...){co_return fail("conflict","Existing account number cannot fit this range.");}
        }
    }
    control.setAccountGroupId(group);control.setAccountHeaderName(name);control.setMinAccount(min);control.setMaxAccount(max);control.setIsActive(active);
    if(parent.empty())control.setParentAccountHeaderIdToNull();else control.setParentAccountHeaderId(parent);
    if(op=="create"){control.setAccountingUnitId(unitId);control.setIsDeleted(false);utils::applyCreateAudit(control,identity);control=co_await controls.insert(control);}
    else {utils::applyUpdateAudit(control,identity);co_await controls.update(control);}
    result.result=publicControl(control);co_return result;
}
}
drogon::Task<dto::BaseApiResponse> AccountControlService::execute(std::string op,std::string id,std::string unitId,Json::Value input,int page,int size,std::string query,utils::AuditIdentity identity) {
    if(!identity.hasTenant()||!identity.hasUser())co_return fail("unauthorized","Tenant authentication required.");
    try {
        if(op=="get"||op=="list")co_return co_await scoped(drogon::app().getDbClient(),op,id,unitId,input,page,size,query,identity);
        if(op!="create"&&op!="update"&&op!="delete")co_return fail("validation_error","Unknown control operation.");
        auto tx=co_await drogon::app().getDbClient()->newTransactionCoro();
        auto result=co_await scoped(tx,op,id,unitId,input,page,size,query,identity);
        if(!result.success){tx->rollback();co_return result;}
        if(!(co_await utils::CommitTransaction{std::move(tx)}))co_return fail("database_error","Unable to commit control changes.");
        co_return result;
    }catch(const UniqueViolation &){co_return fail("conflict","A control with these details already exists.");}
    catch(const std::exception &){co_return fail("database_error","Unable to access account controls.");}
}
}
