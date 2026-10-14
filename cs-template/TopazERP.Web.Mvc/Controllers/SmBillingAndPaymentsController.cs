using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.DomainServices.SchoolManger.BillFooters;
using TopazERP.DomainServices.SchoolManger.PostToGl;
using TopazERP.DomainServices.SchoolManger.ProcessBills.Dto;
using TopazERP.Services.SchoolManager.BillFooters;
using TopazERP.Services.SchoolManager.BillFooters.Dto;
using TopazERP.Services.SchoolManager.CreditMemos;
using TopazERP.Services.SchoolManager.CreditMemos.Dto;
using TopazERP.Services.SchoolManager.FeeSetUps;
using TopazERP.Services.SchoolManager.FeeSetUps.Dto;
using TopazERP.Services.SchoolManager.OpeningBalances;
using TopazERP.Services.SchoolManager.OpeningBalances.Dto;
using TopazERP.Services.SchoolManager.Payments;
using TopazERP.Services.SchoolManager.Payments.Dto;
using TopazERP.Services.SchoolManager.PostToGl;
using TopazERP.Services.SchoolManager.ProcessBills;
using TopazERP.Services.SchoolManager.ProcessBills.Dto;
using TopazERP.Services.SchoolManager.SchGlAccounts;
using TopazERP.Services.SchoolManager.SchGlAccounts.Dto;

namespace TopazERP.Web.Controllers;

public class SmBillingAndPaymentsController: TopazERP.Controllers.TopazERPControllerBase
{
    private readonly ISchGlAccountsAppService _schGlAccountsAppService;
    private readonly IFeeSetUpAppService _feeSetUpAppService;
    private readonly IProcessBillAppService _processBillAppService;
    private readonly IBillFooterAppService _billFooterAppService;
    private readonly IPaymentAppService _paymentAppService;
    private readonly ICreditMemoAppService _creditMemoAppService;
    private readonly IPostToGlAppService _postToGlAppService;
    private readonly IOpeningBalanceAppService _openingBalanceAppService;
    public SmBillingAndPaymentsController(ISchGlAccountsAppService schGlAccountsAppService, IFeeSetUpAppService feeSetUpAppService, IProcessBillAppService processBillAppService, IBillFooterAppService billFooterAppService, IPaymentAppService paymentAppService, ICreditMemoAppService creditMemoAppService, IPostToGlAppService postToGlAppService, IOpeningBalanceAppService openingBalanceAppService)
    {
        _schGlAccountsAppService = schGlAccountsAppService;
        _feeSetUpAppService = feeSetUpAppService;
        _processBillAppService = processBillAppService;
        _billFooterAppService = billFooterAppService;
        _paymentAppService = paymentAppService;
        _creditMemoAppService = creditMemoAppService;
        _postToGlAppService = postToGlAppService;
        _openingBalanceAppService = openingBalanceAppService;
    }

    
    public IActionResult GlAccounts()
    {
        return View();
    }
    public IActionResult FeeSetUp()
    {
        return View();
    }
    public IActionResult CreateFeeSetUp()
    {
        return View();
    }
    public IActionResult FeeSetUpToAll()
    {
        return View();
    }
    public IActionResult UpdateFeeSetUp()
    {
        return View();
    }
    public IActionResult ProcessBill()
    {
        return View();
    }
    public IActionResult CancelBill()
    {
        return View();
    }
    public IActionResult BillFooter()
    {
        return View();
    }
    public IActionResult AllPayment()
    {
        return View();
    }
    public IActionResult ImportPayments()
    {
        return View();
    }
    public IActionResult CreditMemo()
    {
        return View();
    }
    public IActionResult ProcessAllBills()
    {
        return View();
    }
    public IActionResult CancelCreditMemo()
    {
        return View();
    }
    public IActionResult PostBillsAndPayments()
    {
        return View();
    }
    public ActionResult StudentBillInfo()
    {
        return View();
    }
    public ActionResult CancelPayment()
    {
        return View();
    }
    public ActionResult ViewPayments()
    {
        return View();
    }
    public ActionResult OpeningBalance()
    {
        return View();
    }
    public ActionResult PostOpeningBalance()
    {
        return View();
    }
    //billAccounts
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetBillAccounts()
    {
        var result = await _schGlAccountsAppService.ListBillAccounts();
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateBillAccount([FromBody]CreateSchBillAccountInput input)
    {
        var result = await _schGlAccountsAppService.CreateBillAccount(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateBillAccount([FromBody]UpdateSchBillAccountInput input)
    {
        await _schGlAccountsAppService.UpdateBillAccount(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteBillAccount([FromQuery] Guid id)
    {
        await _schGlAccountsAppService.DeleteBillAccount(id);
        return Json(200);
    }
    
    //paymentAccounts
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetPaymentAccounts()
    {
        var result = await _schGlAccountsAppService.ListPaymentAccounts();
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreatePaymentAccount([FromBody]CreateSchPaymentAccountInput input)
    {
        var result = await _schGlAccountsAppService.CreatePaymentAccount(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdatePaymentAccount([FromBody]UpdateSchPaymentAccountInput input)
    {
        await _schGlAccountsAppService.UpdatePaymentAccount(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeletePaymentAccount([FromQuery] Guid id)
    {
        await _schGlAccountsAppService.DeletePaymentAccount(id);
        return Json(200);
    }
    
    //credit memo accounts
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetCreditMemoAccounts()
    {
        var result = await _schGlAccountsAppService.ListCreditMemoAccounts();
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateCreditMemoAccount([FromBody]CreateSchCreditMemoAccountInput input)
    {
        var result = await _schGlAccountsAppService.CreateCreditMemoAccount(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateCreditMemoAccount([FromBody]UpdateSchCreditMemoAccountInput input)
    {
        await _schGlAccountsAppService.UpdateCreditMemoAccount(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteCreditMemoAccount([FromQuery] Guid id)
    {
        await _schGlAccountsAppService.DeleteCreditMemoAccount(id);
        return Json(200);
    }
    
    //fee setups
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetFees()
    {
        var result = await _feeSetUpAppService.ListAllFees();
        return Json(result);
    }
   
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateFee([FromBody]CreateFeeSetUpInput input)
    {
        var result = await _feeSetUpAppService.CreateFee(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateMultipleFees([FromBody]CreateMultipleFeeSetUpInput input)
    {
        var result = await _feeSetUpAppService.CreateMultipleFees(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateFee([FromBody]UpdateFeeSetUpInput input)
    {
        await _feeSetUpAppService.UpdateFee(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteFee([FromQuery] Guid id)
    {
        await _feeSetUpAppService.DeleteFee(id);
        return Json(200);
    }
    //boarding fee
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetBoardingFees()
    {
        var result = await _feeSetUpAppService.ListAllBoardingFees();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateBoardingFee([FromBody] CreateBoardingFeeInput input)
    {
        var result = await _feeSetUpAppService.CreateBoardingFee(input);
        return Json(result);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateMultipleBoardingFees([FromBody]CreateMultipleBoardingFeesInput input)
    {
        var result = await _feeSetUpAppService.CreateMultipleBoardingFees(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateBoardingFee([FromBody] UpdateBoardingFeeInput input)
    {
        await _feeSetUpAppService.UpdateBoardingFee(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteBoardingFee([FromQuery] Guid id)
    {
        await _feeSetUpAppService.DeleteBoardingFee(id);
        return Json(200);
    }
    
    // process bills
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetBills()
    {
        var result = await _processBillAppService.ListAllBills();
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetStudentBills()
    {
        var result = await _processBillAppService.ListAllStudentBills();
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateBill([FromBody]CreateBillInput input)
    {
        var result = await _processBillAppService.CreateBill(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult>UpdateBill([FromBody]UpdateBillInput input)
    {
        await _processBillAppService.UpdateBill(input);
        return Json(200);
    }
  
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ProcessMultipleBills([FromBody]ProcessMultipleBillsInput input)
    {
        var result = await _processBillAppService.ProcessMultipleBills(input);
        return Json(result);
    }
   
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteBill([FromQuery] Guid id)
    {
        await _processBillAppService.DeleteBill(id);
        return Json(200);
    }
    public class BillIdsInput
    {
        public List<Guid> BillIds { get; set; }
    }
   
    public class PaymentIdsInput
    {
        public List<Guid> PaymentIds { get; set; }
    }
    public class BalanceIdsInput
    {
        public List<Guid> BalanceIds { get; set; }
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CancelMultipleBill([FromBody] BillIdsInput input)
    {
        var result = await _processBillAppService.CancelMultipleBills(input.BillIds);
        return Json(result);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CancelStudentBills([FromBody] CancelBillForStudentInput input)
    {
        var result = await _processBillAppService.CancelBillsForStudents(input);
        return Json(result);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CheckExistingBill([FromBody]CheckExistingBillDto input)
    {
        var result = await _processBillAppService.CheckExistingBill(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetBillNumber(Guid academicYearId, Guid termId, Guid classId)
    {
        var result = await _processBillAppService.GenerateBillNumberAsync(academicYearId, termId, classId);
        return Json(result);
    }
    //bill footer
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetBillFooters()
    {
        var result = await _billFooterAppService.ListAll();
        return Json(result);
    }
   
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateBillFooter([FromBody]CreateBillFooterInput input)
    {
        var result = await _billFooterAppService.Create(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateBillFooter([FromBody]UpdateBillFooterInput input)
    {
        await _billFooterAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteBillFooter([FromQuery] Guid id)
    {
        await _billFooterAppService.Delete(id);
        return Json(200);
    }
    
    //payments
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetPayments()
    {
        var result = await _paymentAppService.ListAll();
        return Json(result);
    }
   
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreatePayment([FromBody]CreatePaymentInput input)
    {
        var result = await _paymentAppService.Create(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdatePayment([FromBody]UpdatePaymentInput input)
    {
        await _paymentAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeletePayment([FromQuery] Guid id)
    {
        await _paymentAppService.Delete(id);
        return Json(200);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ProcessPayments([FromBody]PaymentIdsInput input)
    {
        var result = await _paymentAppService.ProcessPayments(input.PaymentIds);
        return Json(result);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CancelPayments([FromBody]PaymentIdsInput input)
    {
        var result = await _paymentAppService.CancelPayments(input.PaymentIds);
        return Json(result);
    }
    
    //credit memo
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetMemos()
    {
        var result = await _creditMemoAppService.ListAll();
        return Json(result);
    }
   
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateMemo([FromBody]CreateSchMemoInput input)
    {
        var result = await _creditMemoAppService.Create(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateMemo([FromBody]UpdateSchMemoInput input)
    {
        await _creditMemoAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteMemo([FromQuery] Guid id)
    {
        await _creditMemoAppService.Delete(id);
        return Json(200);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CancelMemos([FromBody]PaymentIdsInput input)
    {
        var result = await _creditMemoAppService.CancelMemos(input.PaymentIds);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateClassMemo([FromBody]List<CreateSchMemoInput> inputs)
    {
        var result = await _creditMemoAppService.CreateMultiple(inputs);
        return Json(result);
    }
    
    //post to gl
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> PostMemos([FromBody]PaymentIdsInput input)
    {
        var result = await _postToGlAppService.PostCreditMemos(input.PaymentIds);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> PostPayments([FromBody]PaymentIdsInput input)
    {
        var result = await _postToGlAppService.PostPayments(input.PaymentIds);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> PostBills([FromBody]BillIdsInput input)
    {
        var result = await _postToGlAppService.PostBills(input.BillIds);
        return Json(result);
    }
    
    //opening balance
    public async Task<IActionResult> GetBalances()
    {
        var result = await _openingBalanceAppService.ListAll();
        return Json(result);
    }
   
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateBalance([FromBody]CreateStudentOpeningBalanceInput input)
    {
        var result = await _openingBalanceAppService.Create(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateBalance([FromBody]UpdateStudentOpeningBalanceInput input)
    {
        await _openingBalanceAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteBalance([FromQuery] Guid id)
    {
        await _openingBalanceAppService.Delete(id);
        return Json(200);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> PostBalances([FromBody] BalanceIdsInput input)
    {
        var result = await _openingBalanceAppService.PostBalances(input.BalanceIds);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteBalances([FromBody] BalanceIdsInput input)
    {
        var result = await _openingBalanceAppService.Delete(input.BalanceIds);
        return Json(result);
    }
}