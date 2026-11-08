#include "AccountDetailService.h"
#include "utils/TransactionUtil.h"
#include "CoreAccountingUnits.h"
#include "CoreCurrencies.h"
#include "GlAccountGroups.h"
#include "GlAccountControls.h"
#include "GlAccounts.h"
#include "GlAccountBalances.h"
#include "GlBankAccounts.h"
#include "GlBudgets.h"
#include "GlCashReceiptLines.h"
#include "GlDefaultAccounts.h"
#include "GlDeletedJournals.h"
#include "GlFxRevaluationLines.h"
#include "GlImprestRefunds.h"
#include "GlImprestRetirementLines.h"
#include "GlImprestWriteOffs.h"
#include "GlImprests.h"
#include "GlJournalLines.h"
#include "GlPaymentVoucherLines.h"
#include "GlPaymentVoucherRetentions.h"
#include "GlPaymentVouchers.h"
#include "GlPettyCashTransactionLines.h"
#include "GlPettyCashTransactions.h"
#include <algorithm>
#include <regex>
#include <vector>
namespace business_desk::domain_services {
namespace {
using namespace drogon::orm;
using namespace drogon_model::BusinessDesk;
dto::BaseApiResponse fail(const char *code,const char *message) {
    dto::BaseApiResponse r;r.error["code"]=code;r.error["message"]=message;return r;
}
bool uuid(const std::string &id) {static const std::regex pattern("^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$");return std::regex_match(id,pattern);}
std::string trim(std::string text) {auto first=text.find_first_not_of(" \t\r\n"),last=text.find_last_not_of(" \t\r\n");return first==std::string::npos?std::string{}:text.substr(first,last-first+1);}
Json::Value publicAccount(const GlAccounts &account) {
    Json::Value row;row["id"]=account.getValueOfId();row["accountingUnitId"]=account.getValueOfAccountingUnitId();
    row["accountHeaderId"]=account.getValueOfAccountHeaderId();row["accountGroupId"]=account.getValueOfAccountGroupId();
    row["accountNumber"]=account.getValueOfAccountNumber();row["accountName"]=account.getValueOfAccountName();row["status"]=account.getValueOfStatus();
    row["currencyId"]=account.getValueOfCurrencyId().empty()?Json::Value():Json::Value(account.getValueOfCurrencyId());
    row["accountType"]=account.getValueOfStandardAccountType();row["allowManualPosting"]=account.getValueOfAllowManualPosting();row["isControlAccount"]=account.getValueOfIsControlAccount();
    return row;
}
template<class Model> drogon::Task<bool> referenced(DbClientPtr db,const utils::AuditIdentity &identity,const std::string &unit,const std::string &id,std::vector<std::string> columns) {
    auto reference=Criteria(columns.front(),CompareOperator::EQ,id);
    for(size_t i=1;i<columns.size();i++)reference=reference || Criteria(columns[i],CompareOperator::EQ,id);
    if constexpr(requires{Model::Cols::_tenant_id;})reference=reference && Criteria(Model::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId);
    if constexpr(requires{Model::Cols::_accounting_unit_id;})reference=reference && Criteria(Model::Cols::_accounting_unit_id,CompareOperator::EQ,unit);
    if constexpr(requires{Model::Cols::_is_deleted;})reference=reference && Criteria(Model::Cols::_is_deleted,CompareOperator::EQ,false);
    CoroMapper<Model> mapper(db);co_return (co_await mapper.count(reference))>0;
}
// Named column vectors avoid GCC 12 coroutine temporary/parameter-pack issues.
drogon::Task<bool> inUse(DbClientPtr db,utils::AuditIdentity identity,std::string unit,std::string id) {
    const std::vector<std::string> GlAccountBalancesColumns{GlAccountBalances::Cols::_account_id};
    if(co_await referenced<GlAccountBalances>(db,identity,unit,id,GlAccountBalancesColumns))co_return true;
    const std::vector<std::string> GlBankAccountsColumns{GlBankAccounts::Cols::_account_id};
    if(co_await referenced<GlBankAccounts>(db,identity,unit,id,GlBankAccountsColumns))co_return true;
    const std::vector<std::string> GlBudgetsColumns{GlBudgets::Cols::_account_id};
    if(co_await referenced<GlBudgets>(db,identity,unit,id,GlBudgetsColumns))co_return true;
    const std::vector<std::string> GlCashReceiptLinesColumns{GlCashReceiptLines::Cols::_offset_account_id};
    if(co_await referenced<GlCashReceiptLines>(db,identity,unit,id,GlCashReceiptLinesColumns))co_return true;
    const std::vector<std::string> GlDefaultAccountsColumns{
        GlDefaultAccounts::Cols::_accounts_receivable_account_id,
        GlDefaultAccounts::Cols::_accounts_payable_account_id,
        GlDefaultAccounts::Cols::_withholding_tax_account_id,
        GlDefaultAccounts::Cols::_credit_purchases_account_id,
        GlDefaultAccounts::Cols::_advance_from_customer_account_id,
        GlDefaultAccounts::Cols::_covid_tax_received_account_id,
        GlDefaultAccounts::Cols::_communications_service_tax_received_account_id,
        GlDefaultAccounts::Cols::_inventory_account_id,
        GlDefaultAccounts::Cols::_sales_revenue_account_id,
        GlDefaultAccounts::Cols::_stock_purchases_account_id,
        GlDefaultAccounts::Cols::_current_earnings_account_id,
        GlDefaultAccounts::Cols::_retained_earnings_account_id,
        GlDefaultAccounts::Cols::_vat_received_account_id,
        GlDefaultAccounts::Cols::_imprest_gl_account_id,
        GlDefaultAccounts::Cols::_petty_cash_gl_account_id,
        GlDefaultAccounts::Cols::_advance_to_supplier_account_id,
        GlDefaultAccounts::Cols::_covid_tax_paid_account_id,
        GlDefaultAccounts::Cols::_communications_service_tax_paid_account_id,
        GlDefaultAccounts::Cols::_goods_in_transit_account_id,
        GlDefaultAccounts::Cols::_unrealized_fx_loss_account_id,
        GlDefaultAccounts::Cols::_unrealized_fx_gain_account_id,
        GlDefaultAccounts::Cols::_realized_fx_loss_account_id,
        GlDefaultAccounts::Cols::_realized_fx_gain_account_id,
        GlDefaultAccounts::Cols::_vat_paid_account_id,
        GlDefaultAccounts::Cols::_getfl_received_account_id,
        GlDefaultAccounts::Cols::_getfl_paid_account_id,
        GlDefaultAccounts::Cols::_nhil_received_account_id,
        GlDefaultAccounts::Cols::_nhil_paid_account_id,
        GlDefaultAccounts::Cols::_social_security_employer_expense_account_id,
        GlDefaultAccounts::Cols::_social_security_employee_expense_account_id,
        GlDefaultAccounts::Cols::_social_security_employer_liability_account_id,
        GlDefaultAccounts::Cols::_social_security_employee_liability_account_id
    };
    if(co_await referenced<GlDefaultAccounts>(db,identity,unit,id,GlDefaultAccountsColumns))co_return true;
    const std::vector<std::string> GlDeletedJournalsColumns{GlDeletedJournals::Cols::_account_id};
    if(co_await referenced<GlDeletedJournals>(db,identity,unit,id,GlDeletedJournalsColumns))co_return true;
    const std::vector<std::string> GlFxRevaluationLinesColumns{GlFxRevaluationLines::Cols::_account_id};
    if(co_await referenced<GlFxRevaluationLines>(db,identity,unit,id,GlFxRevaluationLinesColumns))co_return true;
    const std::vector<std::string> GlImprestRefundsColumns{GlImprestRefunds::Cols::_debit_account_id,GlImprestRefunds::Cols::_credit_account_id};
    if(co_await referenced<GlImprestRefunds>(db,identity,unit,id,GlImprestRefundsColumns))co_return true;
    const std::vector<std::string> GlImprestRetirementLinesColumns{GlImprestRetirementLines::Cols::_debit_account_id,GlImprestRetirementLines::Cols::_credit_account_id};
    if(co_await referenced<GlImprestRetirementLines>(db,identity,unit,id,GlImprestRetirementLinesColumns))co_return true;
    const std::vector<std::string> GlImprestWriteOffsColumns{GlImprestWriteOffs::Cols::_debit_account_id,GlImprestWriteOffs::Cols::_credit_account_id};
    if(co_await referenced<GlImprestWriteOffs>(db,identity,unit,id,GlImprestWriteOffsColumns))co_return true;
    const std::vector<std::string> GlImprestsColumns{GlImprests::Cols::_credit_account_id,GlImprests::Cols::_debit_account_id};
    if(co_await referenced<GlImprests>(db,identity,unit,id,GlImprestsColumns))co_return true;
    const std::vector<std::string> GlJournalLinesColumns{GlJournalLines::Cols::_account_id};
    if(co_await referenced<GlJournalLines>(db,identity,unit,id,GlJournalLinesColumns))co_return true;
    const std::vector<std::string> GlPaymentVoucherLinesColumns{GlPaymentVoucherLines::Cols::_debit_account_id};
    if(co_await referenced<GlPaymentVoucherLines>(db,identity,unit,id,GlPaymentVoucherLinesColumns))co_return true;
    const std::vector<std::string> GlPaymentVoucherRetentionsColumns{GlPaymentVoucherRetentions::Cols::_credit_account_id};
    if(co_await referenced<GlPaymentVoucherRetentions>(db,identity,unit,id,GlPaymentVoucherRetentionsColumns))co_return true;
    const std::vector<std::string> GlPaymentVouchersColumns{GlPaymentVouchers::Cols::_vat_withholding_account_id,GlPaymentVouchers::Cols::_withholding_account_id};
    if(co_await referenced<GlPaymentVouchers>(db,identity,unit,id,GlPaymentVouchersColumns))co_return true;
    const std::vector<std::string> GlPettyCashTransactionLinesColumns{GlPettyCashTransactionLines::Cols::_expense_account_id};
    if(co_await referenced<GlPettyCashTransactionLines>(db,identity,unit,id,GlPettyCashTransactionLinesColumns))co_return true;
    const std::vector<std::string> GlPettyCashTransactionsColumns{GlPettyCashTransactions::Cols::_petty_cash_account_id};
    if(co_await referenced<GlPettyCashTransactions>(db,identity,unit,id,GlPettyCashTransactionsColumns))co_return true;
    co_return false;
}
drogon::Task<dto::BaseApiResponse> scoped(DbClientPtr db,std::string op,std::string id,std::string unitId,
    Json::Value input,int page,int size,std::string query,utils::AuditIdentity identity) {
    if(!uuid(unitId)|| (op!="create"&&op!="list"&&!uuid(id)))co_return fail("validation_error","Invalid accounting unit or account UUID.");
    CoroMapper<CoreAccountingUnits> units(db);
    if(op=="create"||op=="update"||op=="delete")units.forUpdate();
    auto owned=co_await units.findBy(Criteria(CoreAccountingUnits::Cols::_id,CompareOperator::EQ,unitId) &&
        Criteria(CoreAccountingUnits::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId) && Criteria(CoreAccountingUnits::Cols::_is_deleted,CompareOperator::EQ,false) && Criteria(CoreAccountingUnits::Cols::_is_active,CompareOperator::EQ,true));
    if(owned.empty())co_return fail("not_found","Accounting unit not found or inactive.");
    CoroMapper<GlAccounts> accounts(db);
    const auto scope=Criteria(GlAccounts::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId) && Criteria(GlAccounts::Cols::_accounting_unit_id,CompareOperator::EQ,unitId);
    const auto live=scope && Criteria(GlAccounts::Cols::_is_deleted,CompareOperator::EQ,false);
    dto::BaseApiResponse result;result.success=true;
    if(op=="list") {
        auto search=live;if(!query.empty())search=search && (Criteria(GlAccounts::Cols::_account_name,CompareOperator::Like,"%"+query+"%") || Criteria(GlAccounts::Cols::_account_number,CompareOperator::Like,"%"+query+"%"));
        page=std::clamp(page,1,1000000);size=std::clamp(size,1,200);
        const auto total=co_await accounts.count(search);
        const auto rows=co_await accounts.orderBy(GlAccounts::Cols::_account_number).orderBy(GlAccounts::Cols::_id).limit(size).offset(static_cast<size_t>(page-1)*size).findBy(search);
        result.result["data"]=Json::arrayValue;for(const auto &row:rows)result.result["data"].append(publicAccount(row));
        result.result["totalCount"]=Json::UInt64(total);result.result["pageNo"]=page;result.result["pageSize"]=size;result.result["totalPages"]=Json::UInt64((total+size-1)/size);co_return result;
    }
    GlAccounts account;
    if(op!="create") {
        auto rows=co_await accounts.findBy(live && Criteria(GlAccounts::Cols::_id,CompareOperator::EQ,id));
        if(rows.empty())co_return fail("not_found","Account not found.");account=rows.front();
    }
    if(op=="get"){result.result=publicAccount(account);co_return result;}
    if(op=="delete") {
        if(co_await inUse(db,identity,unitId,id))co_return fail("conflict","Account is referenced by ledger activity, balances or configuration.");
        account.setIsDeleted(true);account.setStatus("inactive");utils::applyUpdateAudit(account,identity);utils::applyDeleteAudit(account,identity);co_await accounts.update(account);
        result.result["id"]=id;result.result["deleted"]=true;co_return result;
    }
    if(!input.isObject())co_return fail("validation_error","Expected an account object.");
    for(const auto &key:input.getMemberNames())if(key!="accountHeaderId"&&key!="accountNumber"&&key!="accountName"&&key!="currencyId"&&key!="status"&&key!="allowManualPosting"&&key!="isControlAccount")
        co_return fail("validation_error","Unexpected account field. Head and type are derived from the control.");
    if(!input["accountHeaderId"].isString()||!uuid(input["accountHeaderId"].asString())||!input["accountNumber"].isString()||!input["accountName"].isString()||!input["status"].isString()||
        (input["status"].asString()!="active"&&input["status"].asString()!="inactive")||!input["allowManualPosting"].isBool()||!input["isControlAccount"].isBool()||
        (!input["currencyId"].isNull()&&(!input["currencyId"].isString()||!uuid(input["currencyId"].asString()))))
        co_return fail("validation_error","Provide a control, number, name, currency, status and posting flags.");
    const auto name=trim(input["accountName"].asString()),number=trim(input["accountNumber"].asString()),header=input["accountHeaderId"].asString();
    if(name.empty()||name.size()>200||number.empty()||number.size()>80||number.find_first_not_of("0123456789")!=std::string::npos)co_return fail("validation_error","Provide a name and a digits-only account number.");
    long long numeric=0;try{numeric=std::stoll(number);}catch(...){co_return fail("validation_error","Account number exceeds the integer range.");}
    if(numeric>2147483647LL)co_return fail("validation_error","Account number exceeds the integer range.");
    const auto normalized=std::to_string(numeric);
    CoroMapper<GlAccountControls> controls(db);
    auto controlScope=Criteria(GlAccountControls::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId) && Criteria(GlAccountControls::Cols::_accounting_unit_id,CompareOperator::EQ,unitId) && Criteria(GlAccountControls::Cols::_is_deleted,CompareOperator::EQ,false);
    auto selected=co_await controls.findBy(controlScope && Criteria(GlAccountControls::Cols::_id,CompareOperator::EQ,header) && Criteria(GlAccountControls::Cols::_is_active,CompareOperator::EQ,true));
    if(selected.empty())co_return fail("validation_error","Select an active control in this accounting unit.");
    const auto &control=selected.front();
    if(numeric<control.getValueOfMinAccount()||numeric>control.getValueOfMaxAccount())co_return fail("validation_error","Account number is outside the control range.");
    if((co_await controls.count(controlScope && Criteria(GlAccountControls::Cols::_parent_account_header_id,CompareOperator::EQ,header)))>0)co_return fail("validation_error","Accounts must belong to a leaf control.");
    CoroMapper<GlAccountGroups> heads(db);
    auto selectedHeads=co_await heads.findBy(Criteria(GlAccountGroups::Cols::_id,CompareOperator::EQ,control.getValueOfAccountGroupId()) && Criteria(GlAccountGroups::Cols::_tenant_id,CompareOperator::EQ,identity.tenantId) && Criteria(GlAccountGroups::Cols::_accounting_unit_id,CompareOperator::EQ,unitId) && Criteria(GlAccountGroups::Cols::_is_deleted,CompareOperator::EQ,false) && Criteria(GlAccountGroups::Cols::_is_active,CompareOperator::EQ,true));
    if(selectedHeads.empty())co_return fail("validation_error","The selected control must belong to an active account head.");
    const auto &head=selectedHeads.front();
    if(head.getValueOfStandardAccountType()<0||head.getValueOfStandardAccountType()>4)co_return fail("validation_error","Invalid head account type.");
    const auto currency=input["currencyId"].isNull()?owned.front().getValueOfBaseCurrencyId():input["currencyId"].asString();
    if(!uuid(currency))co_return fail("validation_error","Configure a valid base currency or select a currency.");
    CoroMapper<CoreCurrencies> currencies(db);
    auto currencyRows=co_await currencies.forUpdate().findBy(Criteria(CoreCurrencies::Cols::_id,CompareOperator::EQ,currency) && Criteria(CoreCurrencies::Cols::_is_deleted,CompareOperator::EQ,false) && Criteria(CoreCurrencies::Cols::_is_active,CompareOperator::EQ,true));
    if(currencyRows.empty())co_return fail("validation_error","Select an active currency.");
    // Read live rows only. Compare normalized numeric values as legacy rows
    // may retain leading zeros; the DB also reserves exact deleted numbers.
    auto duplicates=co_await accounts.findBy(live);
    for(const auto &duplicate:duplicates)if(duplicate.getValueOfId()!=id) {
        const auto existing=duplicate.getValueOfAccountNumber();
        if(!existing.empty() && existing.find_first_not_of("0123456789")==std::string::npos) {
            try {if(std::stoll(existing)==numeric)co_return fail("conflict","Account number is already in use.");}
            catch(const std::out_of_range &) { /* Legacy oversized numbers cannot equal a valid int32 number. */ }
        }
    }
    if(op=="update") {
        const bool identityChanged=account.getValueOfAccountNumber()!=normalized || account.getValueOfAccountHeaderId()!=header || account.getValueOfAccountGroupId()!=head.getValueOfId() || account.getValueOfStandardAccountType()!=head.getValueOfStandardAccountType() || account.getValueOfCurrencyId()!=currency || account.getValueOfIsControlAccount()!=input["isControlAccount"].asBool();
        if(identityChanged) {
            if(co_await inUse(db,identity,unitId,id))co_return fail("conflict","Cannot change account number, classification or currency while the account is in use.");
        }
    }
    account.setAccountHeaderId(header);account.setAccountGroupId(head.getValueOfId());account.setStandardAccountType(head.getValueOfStandardAccountType());
    account.setAccountNumber(normalized);account.setAccountName(name);account.setCurrencyId(currency);account.setStatus(input["status"].asString());
    account.setAllowManualPosting(input["allowManualPosting"].asBool());account.setIsControlAccount(input["isControlAccount"].asBool());
    if(op=="create"){account.setAccountingUnitId(unitId);account.setIsDeleted(false);utils::applyCreateAudit(account,identity);account=co_await accounts.insert(account);}
    else {utils::applyUpdateAudit(account,identity);co_await accounts.update(account);}
    result.result=publicAccount(account);co_return result;
}
}
drogon::Task<dto::BaseApiResponse> AccountDetailService::execute(std::string op,std::string id,std::string unitId,Json::Value input,int page,int size,std::string query,utils::AuditIdentity identity) {
    if(!identity.hasTenant()||!identity.hasUser())co_return fail("unauthorized","Tenant authentication required.");
    try {
        if(op=="get"||op=="list")co_return co_await scoped(drogon::app().getDbClient(),op,id,unitId,input,page,size,query,identity);
        if(op!="create"&&op!="update"&&op!="delete")co_return fail("validation_error","Unknown account operation.");
        auto tx=co_await drogon::app().getDbClient()->newTransactionCoro();
        auto result=co_await scoped(tx,op,id,unitId,input,page,size,query,identity);
        if(!result.success){tx->rollback();co_return result;}
        if(!(co_await utils::CommitTransaction{std::move(tx)}))co_return fail("database_error","Unable to commit account changes.");
        co_return result;
    }catch(const UniqueViolation &){co_return fail("conflict","Account number is already reserved, including deleted accounts.");}
    catch(const std::exception &){co_return fail("database_error","Unable to access accounts.");}
}
}
