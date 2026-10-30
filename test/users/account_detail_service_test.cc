#include "domain_services/gl/AccountDetailService.h"
#include "CoreAccountingUnits.h"
#include "CoreCurrencies.h"
#include "GlAccountGroups.h"
#include "GlAccountControls.h"
#include "GlAccounts.h"
#include "GlBankAccounts.h"
#include "GlAccountBalances.h"
#include "GlJournalLines.h"
#include "GlDefaultAccounts.h"
#include "GlBudgets.h"
#include "GlCashReceiptLines.h"
#include "GlDeletedJournals.h"
#include "GlFxRevaluationLines.h"
#include "GlImprestRefunds.h"
#include "GlImprestRetirementLines.h"
#include "GlImprestWriteOffs.h"
#include "GlImprests.h"
#include "GlPaymentVoucherLines.h"
#include "GlPaymentVoucherRetentions.h"
#include "GlPaymentVouchers.h"
#include "GlPettyCashTransactionLines.h"
#include "GlPettyCashTransactions.h"
using namespace business_desk;
using namespace drogon_model::BusinessDesk;
using namespace drogon::orm;
extern void check(bool,const char*);
void checkAccountDetails() {
    rejectEmptyUuidParameters=true;
    CoroMapper<CoreAccountingUnits>::rows.clear();CoroMapper<CoreCurrencies>::rows.clear();CoroMapper<GlAccountGroups>::rows.clear();CoroMapper<GlAccountControls>::rows.clear();CoroMapper<GlAccounts>::rows.clear();
    const std::string unitId="a0000000-0000-4000-8000-000000000001",unit2="a0000000-0000-4000-8000-000000000002",foreign="a0000000-0000-4000-8000-000000000003";
    const std::string groupId="b0000000-0000-4000-8000-000000000001",controlId="c0000000-0000-4000-8000-000000000001",currencyId="d0000000-0000-4000-8000-000000000001",currency2="d0000000-0000-4000-8000-000000000002";
    CoreAccountingUnits unit;unit.setId(unitId);unit.setTenantId("tenant-a");unit.setIsActive(true);unit.setIsDeleted(false);unit.setBaseCurrencyId(currencyId);CoroMapper<CoreAccountingUnits>(0).insert(unit).get();
    unit.setId(unit2);CoroMapper<CoreAccountingUnits>(0).insert(unit).get();unit.setId(foreign);unit.setTenantId("tenant-b");CoroMapper<CoreAccountingUnits>(0).insert(unit).get();
    CoreCurrencies currency;currency.setId(currencyId);currency.setIsActive(true);currency.setIsDeleted(false);CoroMapper<CoreCurrencies>(0).insert(currency).get();currency.setId(currency2);CoroMapper<CoreCurrencies>(0).insert(currency).get();
    GlAccountGroups head;head.setId(groupId);head.setTenantId("tenant-a");head.setAccountingUnitId(unitId);head.setIsActive(true);head.setIsDeleted(false);head.setStandardAccountType(3);CoroMapper<GlAccountGroups>(0).insert(head).get();
    GlAccountControls control;control.setId(controlId);control.setTenantId("tenant-a");control.setAccountingUnitId(unitId);control.setAccountGroupId(groupId);control.setIsActive(true);control.setIsDeleted(false);control.setMinAccount(1000);control.setMaxAccount(1999);CoroMapper<GlAccountControls>(0).insert(control).get();
    Json::Value input;input["accountHeaderId"]=controlId;input["accountNumber"]="001150";input["accountName"]=" Software sales ";input["currencyId"]=Json::nullValue;input["status"]="active";input["allowManualPosting"]=true;input["isControlAccount"]=false;
    auto run=[&](std::string op,std::string id="",std::string scope="a0000000-0000-4000-8000-000000000001",utils::AuditIdentity who={"tenant-a","user-a"},int page=1,std::string query=""){return domain_services::AccountDetailService::execute(op,id,scope,input,page,1,query,who).get();};
    check(!run("list","",unitId,{}).success,"anonymous account access rejected");
    check(!run("create","",foreign).success,"foreign accounting unit rejected");
    check(!run("get","bad-id").success,"account UUID validated");
    auto made=run("create");check(made.success,"create account without empty UUID dependency queries");auto id=made.result["id"].asString();
    check(made.result["accountNumber"].asString()=="1150"&&made.result["accountName"].asString()=="Software sales","normalize number and trim name");
    check(made.result["accountGroupId"].asString()==groupId&&made.result["accountType"].asInt()==3,"head and nonzero type inherited from real control");
    check(made.result["currencyId"].asString()==currencyId,"null currency resolves to real unit base currency");
    auto saved=CoroMapper<GlAccounts>(0).findByPrimaryKey(id).get();check(saved.getValueOfTenantId()=="tenant-a"&&saved.getValueOfAccountingUnitId()==unitId&&saved.getValueOfCreatedByUserId()=="user-a","account create audit and scope");
    check(run("get",id).success&&run("list").result["totalCount"].asInt()==1,"account detail and list live records");
    check(run("list","",unitId,{"tenant-a","user-a"},1,"missing").result["totalCount"].asInt()==0,"account server search filters");
    for(auto op:{"get","update","delete"}) {
        check(!run(op,id,foreign,{"tenant-b","user-b"}).success,"foreign tenant account operation denied");
        check(!run(op,id,unit2).success,"same tenant other unit account operation denied");
    }
    check(!run("create").success,"duplicate normalized number rejected");
    auto legacyNumber=CoroMapper<GlAccounts>(0).findByPrimaryKey(id).get();legacyNumber.setAccountNumber("0001150");CoroMapper<GlAccounts>(0).update(legacyNumber).get();
    check(!run("create").success,"legacy leading-zero account number also prevents numeric duplicate");legacyNumber.setAccountNumber("1150");CoroMapper<GlAccounts>(0).update(legacyNumber).get();
    input["accountNumber"]="999";check(!run("create").success,"number outside control range rejected");
    input["accountNumber"]="1150.5";check(!run("create").success,"fractional account number rejected");
    input["accountNumber"]="-1150";check(!run("create").success,"negative account number rejected");
    input["accountNumber"]="2147483648";check(!run("create").success,"overflow account number rejected");
    input["accountNumber"]=1150;check(!run("create").success,"number must be a string");input["accountNumber"]="1150";
    input["accountName"]="   ";check(!run("update",id).success,"blank account name rejected");input["accountName"]="Renamed";
    input["accountGroupId"]=groupId;check(!run("update",id).success,"client head override rejected");input.removeMember("accountGroupId");
    input["accountType"]=0;check(!run("update",id).success,"client type override rejected");input.removeMember("accountType");
    input["createdByUserId"]="forged";check(!run("update",id).success,"caller audit fields rejected");input.removeMember("createdByUserId");
    input["allowManualPosting"]="true";check(!run("update",id).success,"string posting flag rejected");input["allowManualPosting"]=false;
    input["status"]="Active";check(!run("update",id).success,"invalid status rejected");input["status"]="inactive";
    check(run("update",id).success,"edit name status and flags");
    saved=CoroMapper<GlAccounts>(0).findByPrimaryKey(id).get();check(saved.getValueOfAccountName()=="Renamed"&&saved.getValueOfStatus()=="inactive"&&!saved.getValueOfAllowManualPosting()&&saved.getValueOfLastModifiedByUserId()=="user-a","account edit and audit persist");
    currency.setId(currencyId);currency.setIsActive(false);CoroMapper<CoreCurrencies>(0).update(currency).get();check(!run("update",id).success,"inactive currency rejected");currency.setIsActive(true);currency.setIsDeleted(true);CoroMapper<CoreCurrencies>(0).update(currency).get();check(!run("update",id).success,"deleted currency rejected");currency.setIsDeleted(false);CoroMapper<CoreCurrencies>(0).update(currency).get();
    control.setIsActive(false);CoroMapper<GlAccountControls>(0).update(control).get();check(!run("update",id).success,"inactive control rejected");control.setIsActive(true);control.setIsDeleted(true);CoroMapper<GlAccountControls>(0).update(control).get();check(!run("update",id).success,"deleted control rejected");control.setIsDeleted(false);control.setAccountingUnitId(unit2);CoroMapper<GlAccountControls>(0).update(control).get();check(!run("update",id).success,"foreign unit control rejected");control.setAccountingUnitId(unitId);CoroMapper<GlAccountControls>(0).update(control).get();
    head.setIsActive(false);CoroMapper<GlAccountGroups>(0).update(head).get();check(!run("update",id).success,"inactive inherited head rejected");head.setIsActive(true);head.setIsDeleted(true);CoroMapper<GlAccountGroups>(0).update(head).get();check(!run("update",id).success,"deleted inherited head rejected");head.setIsDeleted(false);CoroMapper<GlAccountGroups>(0).update(head).get();
    auto child=control;child.setId("c0000000-0000-4000-8000-000000000002");child.setParentAccountHeaderId(controlId);child.setIsActive(false);CoroMapper<GlAccountControls>(0).insert(child).get();check(!run("update",id).success,"even inactive live child makes control non-leaf");child.setIsDeleted(true);CoroMapper<GlAccountControls>(0).update(child).get();check(run("update",id).success,"deleted child does not prevent leaf use");
    // Every account-reference model participates in deletion and identity guards.
    auto dependency=[&]<class Model>(std::string column) {
        Model row;row.data["id"]="reference";row.data["tenant_id"]="tenant-a";row.data["accounting_unit_id"]=unitId;row.data[column]=id;
        if constexpr(requires{Model::Cols::_is_deleted;})row.data["is_deleted"]=false;
        CoroMapper<Model>::rows.clear();CoroMapper<Model>(0).insert(row).get();
        check(!run("delete",id).success,"live account reference blocks delete");
        input["accountNumber"]="1151";check(!run("update",id).success,"live reference blocks number changes");input["accountNumber"]="1150";
        input["currencyId"]=currency2;check(!run("update",id).success,"live reference blocks currency changes");input["currencyId"]=Json::nullValue;
        check(run("update",id).success,"account name and status editable without changing referenced identity");
        if constexpr(requires{Model::Cols::_is_deleted;}) {
            CoroMapper<Model>::rows[0].data["is_deleted"]=true;
            input["accountNumber"]="1151";check(run("update",id).success,"soft-deleted reference ignored by identity guard");
            input["accountNumber"]="1150";check(run("update",id).success,"reset account number after deleted dependency");
        }
        CoroMapper<Model>::rows.clear();
    };
    dependency.template operator()<GlAccountBalances>(GlAccountBalances::Cols::_account_id);
    dependency.template operator()<GlBankAccounts>(GlBankAccounts::Cols::_account_id);
    dependency.template operator()<GlBudgets>(GlBudgets::Cols::_account_id);
    dependency.template operator()<GlCashReceiptLines>(GlCashReceiptLines::Cols::_offset_account_id);
    dependency.template operator()<GlDefaultAccounts>(GlDefaultAccounts::Cols::_accounts_receivable_account_id);
    dependency.template operator()<GlDeletedJournals>(GlDeletedJournals::Cols::_account_id);
    dependency.template operator()<GlFxRevaluationLines>(GlFxRevaluationLines::Cols::_account_id);
    dependency.template operator()<GlImprestRefunds>(GlImprestRefunds::Cols::_debit_account_id);
    dependency.template operator()<GlImprestRetirementLines>(GlImprestRetirementLines::Cols::_debit_account_id);
    dependency.template operator()<GlImprestWriteOffs>(GlImprestWriteOffs::Cols::_debit_account_id);
    dependency.template operator()<GlImprests>(GlImprests::Cols::_credit_account_id);
    dependency.template operator()<GlJournalLines>(GlJournalLines::Cols::_account_id);
    dependency.template operator()<GlPaymentVoucherLines>(GlPaymentVoucherLines::Cols::_debit_account_id);
    dependency.template operator()<GlPaymentVoucherRetentions>(GlPaymentVoucherRetentions::Cols::_credit_account_id);
    dependency.template operator()<GlPaymentVouchers>(GlPaymentVouchers::Cols::_vat_withholding_account_id);
    dependency.template operator()<GlPettyCashTransactionLines>(GlPettyCashTransactionLines::Cols::_expense_account_id);
    dependency.template operator()<GlPettyCashTransactions>(GlPettyCashTransactions::Cols::_petty_cash_account_id);
    CoroMapper<GlAccounts>::failUniqueWrites=true;check(run("update",id).error["code"].asString()=="conflict","database number reservation returns conflict");CoroMapper<GlAccounts>::failUniqueWrites=false;
    drogon::TestTransaction::failCommit=true;check(!run("update",id).success,"failed commit never reports successful account save");drogon::TestTransaction::failCommit=false;
    CoroMapper<GlAccounts>::failQueries=true;auto failed=run("list");check(!failed.success&&failed.toJson().toStyledString().find("private-db-detail")==std::string::npos,"account database error sanitized");CoroMapper<GlAccounts>::failQueries=false;
    check(run("delete",id).success,"unreferenced account soft delete succeeds");
    saved=CoroMapper<GlAccounts>(0).findByPrimaryKey(id).get();check(saved.getValueOfIsDeleted()&&saved.getValueOfStatus()=="inactive"&&saved.getValueOfDeletedByUserId()=="user-a","account soft delete status and audit");
    for(auto op:{"get","update","delete"})check(!run(op,id).success,"deleted account excluded from operations");
    check(run("list").result["totalCount"].asInt()==0,"deleted accounts excluded from lists");
    unit=CoroMapper<CoreAccountingUnits>(0).findByPrimaryKey(unitId).get();unit.setIsDeleted(true);CoroMapper<CoreAccountingUnits>(0).update(unit).get();check(!run("list").success,"deleted accounting unit rejected");
    rejectEmptyUuidParameters=false;
}
