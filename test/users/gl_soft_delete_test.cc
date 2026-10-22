// Regression coverage for live-only GL queries; uses the shared in-memory seam.
#include "domain_services/gl/GlService.h"
#include "GlAccountGroups.h"
#include "GlAccountControls.h"
#include "GlAccounts.h"
#include "GlBankAccounts.h"
#include "GlAccountingPeriods.h"
#include "GlAccountBalances.h"
#include "CoreAccountingUnits.h"
#include "CoreCurrencies.h"
using namespace business_desk;
using namespace drogon_model::BusinessDesk;
using namespace drogon::orm;
extern void check(bool, const char *);
void checkGlSoftDeletes() {
 domain_services::GlService service;
 utils::AuditIdentity actor{"tenant-a","actor"};
 CoreCurrencies currency; currency.setId("currency"); currency.setIsActive(true); currency.setIsDeleted(false);
 CoroMapper<CoreCurrencies>(0).insert(currency).get();
 CoreAccountingUnits unit; unit.setId("unit"); unit.setCode("HQ"); unit.setTenantId("tenant-a"); unit.setIsDeleted(true);
 CoroMapper<CoreAccountingUnits>(0).insert(unit).get();
 dto::AccountingUnitDto unitDto; unitDto.setCode("HQ"); unitDto.setName("HQ"); unitDto.setBaseCurrencyId("currency");
 check(!service.updateAccountingUnit(unitDto,"unit",actor).get().success,"deleted unit cannot be updated");
 check(!service.deleteAccountingUnit("unit",actor).get().success,"deleted unit cannot be deleted again");
 check(service.getAllAccountingUnits(1,20,"").get().result["totalCount"].asUInt64()==0,"deleted units hidden");
 auto created=service.createAccountingUnit(unitDto,actor).get(); check(created.success,"deleted unit excluded from code check");
 auto liveUnit=created.result["id"].asString();
 check(!service.createAccountingUnit(unitDto,actor).get().success,"live duplicate unit still rejected");
 // Rename another live unit to a code reserved only by a deleted unit.
 unitDto.setCode("BRANCH"); auto branch=service.createAccountingUnit(unitDto,actor).get(); check(branch.success,"create second live unit");
 CoreAccountingUnits old; old.setId("retired"); old.setCode("RETIRED"); old.setTenantId("tenant-a"); old.setIsDeleted(true); CoroMapper<CoreAccountingUnits>(0).insert(old).get();
 unitDto.setCode("RETIRED"); check(service.updateAccountingUnit(unitDto,branch.result["id"].asString(),actor).get().success,"deleted unit excluded from update code check");
 GlAccountGroups head; head.setId("head"); head.setAccountingUnitId(liveUnit); head.setIsDeleted(true); CoroMapper<GlAccountGroups>(0).insert(head).get();
 GlAccountControls control; control.setId("control"); control.setAccountingUnitId(liveUnit); control.setIsDeleted(true); CoroMapper<GlAccountControls>(0).insert(control).get();
 GlAccounts account; account.setId("account"); account.setAccountingUnitId(liveUnit); account.setAccountNumber("100"); account.setIsDeleted(true); CoroMapper<GlAccounts>(0).insert(account).get();
 GlBankAccounts bank; bank.setId("bank"); bank.setAccountingUnitId(liveUnit); bank.setIsDeleted(true); CoroMapper<GlBankAccounts>(0).insert(bank).get();
 GlAccountingPeriods period; period.setId("period"); period.setAccountingUnitId(liveUnit); period.setIsDeleted(true); CoroMapper<GlAccountingPeriods>(0).insert(period).get();
 check(service.getAllAccountHeads(1,20,"").get().result["totalCount"].asUInt64()==0,"deleted heads hidden");
 check(service.getAllCoaControls(1,20,"").get().result["totalCount"].asUInt64()==0,"deleted controls hidden");
 check(service.getAllCoaDetails(1,20,"").get().result["totalCount"].asUInt64()==0,"deleted details hidden");
 check(service.getAllBankAccounts(1,20,"").get().result["totalCount"].asUInt64()==0,"deleted bank accounts hidden");
 check(!service.deleteAccountHead("head",actor).get().success,"deleted head cannot be deleted again");
 check(!service.deleteCoaControl("control",actor).get().success,"deleted control cannot be deleted again");
 check(!service.deleteCoaDetail("account",actor).get().success,"deleted detail cannot be deleted again");
 check(!service.deleteBankAccount("bank",actor).get().success,"deleted bank cannot be deleted again");
 // Every deleted dependency above must be ignored by the unit dependency checks.
 check(service.deleteAccountingUnit(liveUnit,actor).get().success,"deleted dependencies do not block unit deletion");
 auto branchId=branch.result["id"].asString(); bank.setId("live-bank"); bank.setAccountingUnitId(branchId); bank.setIsDeleted(false); CoroMapper<GlBankAccounts>(0).insert(bank).get();
 check(!service.deleteAccountingUnit(branchId,actor).get().success,"live dependency still blocks deletion");
 // A balance has no soft-delete flag and must always block deletion.
 bank.setIsDeleted(true); CoroMapper<GlBankAccounts>(0).update(bank).get();
 GlAccountBalances balance; balance.setId("balance"); balance.setAccountingUnitId(branchId); CoroMapper<GlAccountBalances>(0).insert(balance).get();
 check(!service.deleteAccountingUnit(branchId,actor).get().success,"balances without deletion flag still protect unit");
 // Live control + head, with an old deleted account using the same number.
 head.setId("live-head"); head.setIsDeleted(false); head.setIsActive(true); head.setStandardAccountType(0); CoroMapper<GlAccountGroups>(0).insert(head).get();
 control.setId("live-control"); control.setIsDeleted(false); control.setIsActive(true); control.setAccountGroupId("live-head"); control.setMinAccount(1); control.setMaxAccount(999); CoroMapper<GlAccountControls>(0).insert(control).get();
 dto::ChartOfAccountDetailDto detail; detail.setAccountName("Cash"); detail.setAccountNo(100); detail.setAccountControlId("live-control");
 auto cash=service.createCoaDetail(detail,actor).get(); check(cash.success,"deleted account excluded from create duplicate check");
 check(!service.createCoaDetail(detail,actor).get().success,"live duplicate account still rejected");
 account.setId("retired-account"); account.setAccountNumber("101"); CoroMapper<GlAccounts>(0).insert(account).get();
 detail.setAccountNo(101); check(service.updateCoaDetail(detail,cash.result["id"].asString(),actor).get().success,"deleted account excluded from update duplicate check");
 check(!service.updateCoaDetail(detail,"account",actor).get().success,"deleted detail cannot be updated");
}
