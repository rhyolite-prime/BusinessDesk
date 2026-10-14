using System;
using System.Collections.Generic;
using System.Dynamic;
using System.Threading.Tasks;
using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.DomainServices.Ledger.Budgets.Dto;
using TopazERP.DomainServices.Ledger.Journals.Dto;
using TopazERP.DomainServices.Ledger.Vouchers.Dto;
using TopazERP.Services.Ledger.AccountingPeriods;
using TopazERP.Services.Ledger.Budgets;
using TopazERP.Services.Ledger.Budgets.Dto;
using TopazERP.Services.Ledger.CoaDetails;
using TopazERP.Services.Ledger.DefaultGlNumbers;
using TopazERP.Services.Ledger.Imprests;
using TopazERP.Services.Ledger.Imprests.Dto;
using TopazERP.Services.Ledger.Journals;
using TopazERP.Services.Ledger.Journals.Dto;
using TopazERP.Services.Ledger.Reports;
using TopazERP.Services.Ledger.Vouchers;
using TopazERP.Services.Ledger.Vouchers.Dto;
using TopazERP.Services.Shared.CompanyProfiles;
using TopazERP.Services.Shared.CostCenters;
using TopazERP.Services.Shared.SystemNumbers;

namespace TopazERP.Web.Controllers;

[Abp.AspNetCore.Mvc.Authorization.AbpMvcAuthorize]
public class LedgerDataEntryController : TopazERP.Controllers.TopazERPControllerBase
{
    private readonly IBudgetAppService _budgetAppService;
    private readonly IJournalAppService _journalAppService;
    private readonly ICostCenterAppService _orgCostCenterAppService;
    private readonly ICoaDetailAppService _coaDetailAppService;
    private readonly IPaymentVoucherAppService _paymentVoucherAppService;
    private readonly IAccountingPeriodAppService _accountingPeriodAppService;
    private readonly ICompanyProfileAppService _companyProfileAppService;
    private readonly IDefaultGlNumberAppService _defaultGlNumberAppService;
    private readonly ISystemNumberAppService  _systemNumberAppService;
    private readonly IGlReportAppService  _glReportAppService;
    private readonly ImprestAppService _imprestAppService;
    private readonly ImprestRefundAppService _imprestRefundAppService;
    private readonly ImprestRetirementAppService _imprestRetirementAppService;
    private readonly ImprestWriteoffAppService _imprestWriteoffAppService;
    private readonly IPettyCashAppService _pettyCashAppService;

    public LedgerDataEntryController(IBudgetAppService budgetAppService, IJournalAppService journalAppService, ICostCenterAppService orgCostCenterAppService, ICoaDetailAppService coaDetailAppService, IPaymentVoucherAppService paymentVoucherAppService, IAccountingPeriodAppService accountingPeriodAppService, ICompanyProfileAppService companyProfileAppService, IDefaultGlNumberAppService defaultGlNumberAppService, ISystemNumberAppService systemNumberAppService, IGlReportAppService glReportAppService, ImprestAppService imprestAppService, ImprestRefundAppService imprestRefundAppService, ImprestRetirementAppService imprestRetirementAppService, ImprestWriteoffAppService imprestWriteoffAppService, IPettyCashAppService pettyCashAppService)
    {
        _budgetAppService = budgetAppService;
        _journalAppService = journalAppService;
        _orgCostCenterAppService = orgCostCenterAppService;
        _coaDetailAppService = coaDetailAppService;
        _paymentVoucherAppService = paymentVoucherAppService;
        _accountingPeriodAppService = accountingPeriodAppService;
        _companyProfileAppService = companyProfileAppService;
        _defaultGlNumberAppService = defaultGlNumberAppService;
        _systemNumberAppService = systemNumberAppService;
        _glReportAppService = glReportAppService;
        _imprestAppService = imprestAppService;
        _imprestRefundAppService = imprestRefundAppService;
        _imprestRetirementAppService = imprestRetirementAppService;
        _imprestWriteoffAppService = imprestWriteoffAppService;
        _pettyCashAppService = pettyCashAppService;
    }

    // GET
    public IActionResult Budget()
    {
        return View();
    }
    
    public IActionResult JournalEntry()
    {
        return View();
    }
    
    public IActionResult JournalBatchSequenceSetup()
    {
        return View();
    }
    
    public IActionResult JournalTransactions()
    {
        return View();
    }
    
    public IActionResult JournalEntryMc()
    {
        return View();
    }
    
    public IActionResult PostJournalEntry()
    {
        return View();
    }

    public IActionResult EditTransactions()
    {
        return View();
    }
    public IActionResult AllVouchers()
    {
        return View();
    }
    
    public IActionResult PettyCash()
    {
        return View();
    }
    public IActionResult SupplierPaymentVouchers(Guid id)
    {
        dynamic viewmodel = new ExpandoObject();
         
        viewmodel.VoucherId = id;
        
        return View(viewmodel);
    }
    
    public IActionResult PaymentVoucherPreview(Guid id)
    {
        dynamic viewmodel = new ExpandoObject();
         
        viewmodel.VoucherId = id;
        
        return View(viewmodel);
    }
    
    public IActionResult ReceiptVoucherPreview(Guid id)
    {
        dynamic viewmodel = new ExpandoObject();
        
        viewmodel.VoucherId = id;
        
        return View(viewmodel);
    }
    
  

    public IActionResult EmployeePaymentVouchers(Guid id)
    {
        dynamic viewmodel = new ExpandoObject();
         
        viewmodel.VoucherId = id;
        
        return View(viewmodel);
    }

    public IActionResult CustomerReceiptVouchers()
    {
        return View();
    }

    public IActionResult RefundImprestDetail()
    {
        return View();
    }
    
    public IActionResult RetireImprestDetail()
    {
        return View();
    }
    
    public IActionResult WriteOffImprestDetail()
    {
        return View();
    }

    public IActionResult VoucherHistory()
    { 
        return View();
    }
        
    public IActionResult UnpaidWithholding()
    {
        return View();
    }
    
    public IActionResult UnpaidVatWithholding()
    {
        return View();
    }
    
    public IActionResult UnpaidRetensions()
    {
        return View();
    }
    
    public IActionResult PaidWithholding()
    {
        return View();
    }
    
    public IActionResult PaidVatWithholding()
    {
        return View();
    }
    
    public IActionResult MicellaneousVouchers()
    {
        return View();
    }
    
    public IActionResult Imprest()
    {
        return View();
    }
    
    public IActionResult AddImprest()
    {
        return View();
    }

    public IActionResult RetireImprest()
    {
        return View();
    }

    public IActionResult RefundImprest()
    {
        return View();
    }

    public IActionResult WriteOffImprest()
    {
        return View();
    }

    public IActionResult ViewOutstandingImprest()
    {
        return View();
    }

    public IActionResult ConvertOutstandingBalanceToPayrollLoans()
    {
        return View();
    }

    public IActionResult TransferImprestFromPaymentVouchers()
    {
        return View();
    }

    public IActionResult PostImprestToGl()
    {
        return View();
    }
    
    public IActionResult ClosePeriod()
    {
        return View();
    }
    
    
    
      //api

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetBudget()
        {
            var budgets = await _budgetAppService.ListAll();
            var accounts = await _coaDetailAppService.ListAll();
            var costCenters = await _orgCostCenterAppService.ListAll();
            
            return Json(new { budgets, accounts, costCenters });
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateBudget([FromBody] CreateBudgetInput input)
        {
            await _budgetAppService.Create(input);
            return Json(200);
        }

        public async Task<ActionResult> UpdateBudget([FromBody] UpdateBudgetInput input)
        {
            await _budgetAppService.Update(input);
            return Json(200);
        }

        public async Task<ActionResult> DelBudget([FromQuery] Guid id)
        {
            await _budgetAppService.Delete(id);
            return Json(200);
        }
        
        //budget details...
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateBudgetDetail([FromBody] BudgetDetailInput input)
        {
            var result = await _budgetAppService.CreateBudgetDetail(input);
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateBudgetDetail([FromBody] BudgetDetailInput input)
        {
            await _budgetAppService.UpdateBudgetDetail(input);
            return Json(200);
        }
            
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteBudgetDetail([FromBody] BudgetDetailInput input)
        {
            await _budgetAppService.DeleteBudgetDetail(input);
            return Json(200);
        }
    
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitJournalEntry()
        {
            var accounts = await _coaDetailAppService.ListLocalAccounts();
            var costCenters = await _orgCostCenterAppService.ListAll();
            var journalBatchSequence = await _journalAppService.GetJournalBatchSequence();
            var businessProfile = await _companyProfileAppService.GetProfile();
            
            return Json(new { accounts, costCenters, journalBatchSequence, enforceOu = businessProfile is { EnforceOu: true } });
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitJournalEntryMc()
        {
            var accounts = await _coaDetailAppService.ListActiveAccounts();
            var costCenters = await _orgCostCenterAppService.ListAll();
            var journalBatchSequence = await _journalAppService.GetJournalBatchSequence();
            var businessProfile = await _companyProfileAppService.GetProfile();
            
            
            return Json(new { accounts, costCenters, journalBatchSequence, enforceOu = businessProfile is { EnforceOu: true } });
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitSupplierPvEntry()
        {
            var accounts = await _coaDetailAppService.ListActiveAccounts();
            var costCenters = await _orgCostCenterAppService.ListAll();
            var businessProfile = await _companyProfileAppService.GetProfile();
            var defaultGlNumbers = await _defaultGlNumberAppService.GetDefaultSetup();
            var voucherBatchSystemNumber = await _systemNumberAppService.GetDetails("General Ledger", "GL-VoucherBatchNumbers");
            
            return Json(new { accounts, defaultGlNumbers, costCenters, voucherBatchSystemNumber, enforceOu = businessProfile is { EnforceOu: true } });
        }
        
        
         
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateJournal([FromBody] CreateJournalInput input)
        {
            await _journalAppService.Create(input);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> SetupBatchSequence([FromBody] CreateJournalBatchSequenceInput input)
        {
            await _journalAppService.SetupBatchSequence(input);
            return Json(200);
        }
        
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteJournal([FromBody] List<Guid> Ids)
        {
            await _journalAppService.BatchDelete(Ids);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetJournalEntries()
        {
            var results = await _journalAppService.ListAll();
            return Json(results);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetUnpostedJournalEntries()
        {
            var journalData = await _journalAppService.ListAll(false);
            
            var accounts = await _coaDetailAppService.ListAll();
            
            var costCenters = await _orgCostCenterAppService.ListAll();
            
            return Json(new {journalData, accounts, costCenters });
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> PostJournalEntries([FromBody] JournalDto dto)
        { 
             await _journalAppService.Post(dto.Ids);
             return Json(200);
        }


        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> DelJournalEntries([FromBody] JournalDto dto)
        {
            await _journalAppService.BatchDelete(dto.Ids);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> UpdateJournalDetails([FromBody] UpdateJournalDetailsDto dto )
        {
            await _journalAppService.Update(dto);
            return Json(200);
        }
        
        
        //vouchers...
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetVoucherData([FromQuery]DateTime? startDate, DateTime? endDate, string voucherType)
        {
            var sd = startDate ?? DateTime.UtcNow;
            var ed = endDate ?? DateTime.UtcNow;
            
            var results = await _paymentVoucherAppService.ListAll(sd, ed, voucherType);
            return Json(results);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> PostVouchers([FromBody]PostVoucherDto dto)
        {
            await _paymentVoucherAppService.PostVouchers(dto);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteVouchers([FromBody]PostVoucherDto dto)
        {
            await _paymentVoucherAppService.DeleteVouchers(dto);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetVoucherDetails([FromQuery]Guid id)
        {
            var results = await _paymentVoucherAppService.GetDetails(id);
            return Json(results);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GenerateVoucherPreview([FromQuery]Guid id)
        {
            var reportHeader = await _glReportAppService.GetReportHeader($"Payment Voucher");

            var reportDetails = await _paymentVoucherAppService.GeneratePreview(id);
            
            return Json(new { reportHeader, reportDetails });
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GenerateReceiptVoucherPreview([FromQuery]Guid id)
        {
            var reportHeader = await _glReportAppService.GetReportHeader($"Receipt Voucher");

            var reportDetails = await _paymentVoucherAppService.GenerateReceiptVoucherPreview(id);
            
            return Json(new { reportHeader, reportDetails });
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetUnpaidWithholdingVoucher([FromQuery]DateTime? startDate, DateTime? endDate)
        {
            var results = await _paymentVoucherAppService.GetUnpaidWithholdingVoucher(startDate, endDate);
            return Json(results);
        }
        
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> CreateVoucher([FromBody]CreateGlPaymentVoucherInput input)
        {
            var result = await _paymentVoucherAppService.Create(input);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> UpdateVoucher([FromBody]UpdateGlPaymentVoucherInput input)
        {
            await _paymentVoucherAppService.Update(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> DelVoucher([FromQuery] Guid id)
        {
            await _paymentVoucherAppService.Delete(id);
            return Json(200);
        }
        
        // Petty Cash
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitPettyCashEntry()
        {
            var accounts = await _coaDetailAppService.ListActiveAccounts();
            var costCenters = await _orgCostCenterAppService.ListAll();
            var defaultGlNumbers = await _defaultGlNumberAppService.GetDefaultSetup();
            var voucherBatchSystemNumber = await _systemNumberAppService.GetDetails("General Ledger", "GL-PettyCashNumbers");
            var businessProfile = await _companyProfileAppService.GetProfile();
            
            return Json(new { accounts, defaultGlNumbers, costCenters, voucherBatchSystemNumber, enforceOu = businessProfile is { EnforceOu: true } });
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetPettyCashData([FromQuery]DateTime? startDate, DateTime? endDate)
        {
            var sd = startDate ?? DateTime.UtcNow;
            var ed = endDate ?? DateTime.UtcNow;
            
            var results = await _pettyCashAppService.ListAll(sd, ed);
            return Json(results);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetPettyCashDetails([FromQuery]Guid id)
        {
            var results = await _pettyCashAppService.GetDetails(id);
            return Json(results);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> CreatePettyCash([FromBody]CreatePettyCashTransactionInput input)
        {
            var result = await _pettyCashAppService.Create(input);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> UpdatePettyCash([FromBody]UpdatePettyCashTransactionInput input)
        {
            await _pettyCashAppService.Update(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> DelPettyCash([FromQuery] Guid id)
        {
            await _pettyCashAppService.Delete(id);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> PostPettyCash([FromBody]PostVoucherDto dto)
        {
            await _pettyCashAppService.PostPettyCash(dto);
            return Json(200);
        }

        //Imprest
    
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetImprests()
        {
            var results = await _imprestAppService.ListAll();
            return Json(results);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeImprests([FromQuery]Guid employeeId)
        {
            var results = await _imprestAppService.GetEmployeeImprests(employeeId);
            return Json(results);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> CreateImprest([FromBody]ImprestDto dto)
        {
            await _imprestAppService.Create(dto);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> UpdateImprest([FromBody]ImprestDto dto)
        {
            await _imprestAppService.Update(dto);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> DelImprest([FromQuery]Guid id)
        {
            await _imprestAppService.Delete(id);
            return Json(200);
        }
        
        
        [HttpPost]
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> RetireImprestPost([FromBody]ImprestRetirementDto dto)
        {
            await _imprestRetirementAppService.Create(dto);
            return Json(new { success = true, message = "Imprest retired successfully" });
        }

        [HttpPost]
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> RefundImprestPost([FromBody]ImprestRefundDto dto)
        {
            await _imprestRefundAppService.Create(dto);
            return Json(new { success = true, message = "Imprest refunded successfully" });
        }

        [HttpPost]
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> WriteOffImprestPost([FromBody]ImprestWriteoffDto dto)
        {
            await _imprestWriteoffAppService.Create(dto);
            return Json(new { success = true, message = "Imprest written off successfully" });
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetImprestRetirements()
        {
            var results = await _imprestRetirementAppService.ListAll();
            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetImprestRefunds()
        {
            var results = await _imprestRefundAppService.ListAll();
            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetImprestWriteOffs()
        {
            var results = await _imprestWriteoffAppService.ListAll();
            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeImprestRefunds([FromQuery] Guid employeeId)
        {
            var result = await _imprestRefundAppService.GetEmployeeImprestRefunds(employeeId);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeImprestRetirements([FromQuery] Guid employeeId)
        {
            var result = await _imprestRetirementAppService.GetEmployeeImprestRetirements(employeeId);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeImprestWriteOffs([FromQuery] Guid employeeId)
        {
            var result = await _imprestWriteoffAppService.GetEmployeeImprestWriteOffs(employeeId);
            return Json(result);
        }
        
        [HttpPost]
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> PostImprestsToGL([FromBody] dynamic payload)
        {
            // TODO: Implement ImprestAppService.PostToGL(payload.ids)
            return Json(new { success = true, message = "Posted successfully" });
        }

        [HttpPost]
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> PostRetirementsToGL([FromBody] dynamic payload)
        {
            // TODO: Implement ImprestRetirementAppService.PostToGL(payload.ids)
            return Json(new { success = true, message = "Posted successfully" });
        }

        [HttpPost]
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> PostRefundsToGL([FromBody] dynamic payload)
        {
            // TODO: Implement ImprestRefundAppService.PostToGL(payload.ids)
            return Json(new { success = true, message = "Posted successfully" });
        }

        [HttpPost]
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> PostWriteoffsToGL([FromBody] dynamic payload)
        {
            // TODO: Implement ImprestWriteoffAppService.PostToGL(payload.ids)
            return Json(new { success = true, message = "Posted successfully" });
        }

        [HttpPost]
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteBulkImprests([FromBody] dynamic payload)
        {
            // TODO: Implement ImprestAppService.BulkDelete(payload.ids)
            return Json(new { success = true, message = "Deleted successfully" });
        }

        [HttpPost]
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteBulkRetirements([FromBody] dynamic payload)
        {
            // TODO: Implement ImprestRetirementAppService.BulkDelete(payload.ids)
            return Json(new { success = true, message = "Deleted successfully" });
        }

        [HttpPost]
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteBulkRefunds([FromBody] dynamic payload)
        {
            // TODO: Implement ImprestRefundAppService.BulkDelete(payload.ids)
            return Json(new { success = true, message = "Deleted successfully" });
        }

        [HttpPost]
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteBulkWriteoffs([FromBody] dynamic payload)
        {
            // TODO: Implement ImprestWriteoffAppService.BulkDelete(payload.ids)
            return Json(new { success = true, message = "Deleted successfully" });
        }

        // accounting period
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> GetJournalTransactions([FromQuery] DateTime? startDate, DateTime? endDate, string transactionType)
        {
            await Task.Delay(2);
            //var results= await _journalAppService.GetTransactionsByPeriod(month, year);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> GetJournalTransactionsByPeriod([FromQuery] int month, int year)
        {
            var results= await _journalAppService.GetTransactionsByPeriod(month, year);
            return Json(results);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> CloseAccountingPeriod([FromQuery] int month, int year)
        {
            await _accountingPeriodAppService.ClosePeriod(month, year);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> GetLastClosedPeriod()
        {
            var results = await _accountingPeriodAppService.GetLastClosedPeriod();
            return Json(results);
        }
}