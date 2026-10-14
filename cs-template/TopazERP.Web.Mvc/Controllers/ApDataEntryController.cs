using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;
using TopazERP.Web.Models;
using System;
using System.Collections.Generic;
using System.Dynamic;
using Abp.Authorization;
using TopazERP.Authorization;
using System.Threading.Tasks;
using Abp.Auditing;
using TopazERP.Services.Ap.OpeningBalances;
using TopazERP.Services.Ap.OpeningBalances.Dto;
using TopazERP.Services.Ap.ApInvoices;
using TopazERP.Services.Ap.ApInvoices.Dto;
using TopazERP.DomainServices.Ap.ApInvoices.Dto;
using TopazERP.Services.Ap.ApVouchers;
using TopazERP.Services.Ap.ApVouchers.Dto;
using TopazERP.Models.Ap;
using TopazERP.Models.Shared;
using TopazERP.Services.Ap.ApPayment;
using TopazERP.Services.Ap.ApPayment.Dto;
using TopazERP.Services.Ap.ApWithHoldingPayments;
using TopazERP.Services.Ap.ApWithHoldingPayments.Dto;
using TopazERP.Services.Ap.DebitMemo;
using TopazERP.Services.Ap.DebitMemo.Dto;
using TopazERP.Services.Shared.CompanyProfiles;

namespace TopazERP.Web.Controllers
{
    [AbpAuthorize(PermissionNames.Ap_DataEntry)]
    public class ApDataEntryController : TopazERPControllerBase
    {
        private readonly IOpeningBalanceAppService _openingBalanceAppService;
        private readonly IApInvoiceAppService _apInvoiceAppService;
        private readonly IApVoucherAppService _apVoucherAppService;
        private readonly IApPaymentAppService _apPaymentAppService;
        private readonly IApWithHoldingAppService _apWithHoldingAppService;
        private readonly IDebitMemoAppService _debitMemoAppService;
        private readonly ICompanyProfileAppService _companyProfileAppService;
        public ApDataEntryController(IOpeningBalanceAppService openingBalanceAppService, IApInvoiceAppService apInvoiceAppService, IApVoucherAppService apVoucherAppService, IApPaymentAppService apPaymentAppService,IApWithHoldingAppService apWithHoldingAppService, IDebitMemoAppService debitMemoAppService, ICompanyProfileAppService companyProfileAppService)
        {
            _openingBalanceAppService = openingBalanceAppService;
            _apInvoiceAppService = apInvoiceAppService;
            _apVoucherAppService = apVoucherAppService;
            _apPaymentAppService = apPaymentAppService;
            _apWithHoldingAppService = apWithHoldingAppService;
            _debitMemoAppService = debitMemoAppService;
            _companyProfileAppService = companyProfileAppService;
        }
     
        [AbpAuthorize(PermissionNames.Ap_DataEntry_Payments)]
        public ActionResult AllPayments()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_DataEntry_EditPayments)]
        public ActionResult EditPayment(Guid id)
        {
            ViewBag.PaymentId = id;
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_DataEntry_Vouchers)]
        public ActionResult VoucherAction()
        {
            return View();
        }
        
        [AbpAuthorize(PermissionNames.Ap_DataEntry_OpeningBalances)]
        public ActionResult OpeningBalances()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_DataEntry_OpeningBalances)]
        public ActionResult CreateBalance()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_DataEntry_OpeningBalances)]
        public ActionResult EditBalance(Guid id)
        {
            ViewBag.BalanceId = id;
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_DataEntry_OpeningBalances)]
        public ActionResult PostBalance()
        {
            return View();
        }
        //api
        //opening balances
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetOpeningBalances()
        {
            var result = await _openingBalanceAppService.ListAll();
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateOpeningBalances([FromBody] CreateOpeningBalanceInput input)
        {
            var result = await _openingBalanceAppService.Create(input);
            return Json(result);
        }
        
        
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateOpeningBalances([FromBody] UpdateOpeningBalanceInput input)
        {
            await _openingBalanceAppService.Update(input);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteOpeningBalances(Guid id)
        {
            await _openingBalanceAppService.Delete(id);
            return Json(200);
        }
        
        //Post Opening Balances
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitPostBalances([FromBody] PostBalanceDto postBalance)
        {
            var results = await _openingBalanceAppService.PostOpeningBalances(postBalance.BalanceIds);
            
            return Json(results);
        }
        
        
        //get opening balances with is_posted = true
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetPostedOpeningBalances()
        {
            var result = await _openingBalanceAppService.GetPostedOpeningBalances();
            return Json(result);
        }
        
        //get ou hierarchy
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetOuHierarchy()
        {
            var result = await _openingBalanceAppService.GetOuHierarchy();
            return Json(result);
        }
        
        
        //invoices
        [AbpAuthorize(PermissionNames.Ap_DataEntry_Invoices)]
        public ActionResult Invoices()
        {
            
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_DataEntry_CreateInvoice)]
        public ActionResult AddInvoice()
        {
            
            return View();
        }
        public ActionResult EditInvoice(Guid id, bool isPosted)
        {
            string permissionError = null;
            if (isPosted)
            {
                if (!PermissionChecker.IsGranted(PermissionNames.Ap_DataEntry_EditPostedInvoice))
                {
                    permissionError = "You do not have permission to edit posted invoices.";
                }
            }
            else
            {
                if (!PermissionChecker.IsGranted(PermissionNames.Ap_DataEntry_EditInvoice))
                {
                    permissionError = "You do not have permission to edit invoices.";
                }
            }

            ViewBag.InvoiceId = id;
            ViewBag.IsPosted = isPosted;
            ViewBag.PermissionError = permissionError;
            return View();
        }

        
        //api for invoices
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetInvoices()
        {
            var result = await _apInvoiceAppService.ListAll();
            return Json(result);
        }
        

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateInvoice([FromBody] CreateInvoiceInput input)
        {
            var result = await _apInvoiceAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateInvoice([FromBody] UpdateInvoiceInput input)
        {
            await _apInvoiceAppService.Update(input);
            return Json(200);

        }
        
        [AbpAuthorize(PermissionNames.Ap_DataEntry_PostInvoices)]
        public ActionResult PostInvoice()
        {
            return View();
        }
        //post invoice
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitPostInvoice([FromBody] PostInvoiceDto postInvoice)
        {
           var results = await _apInvoiceAppService.PostInvoice(postInvoice.InvoiceIds);
            
            return Json(results);
        }
        //cancel invoice
        [AbpAuthorize(PermissionNames.Ap_DataEntry_CancelInvoices)]
        public ActionResult CancelInvoice()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_DataEntry_ChangeInvoiceStatus)]
        public ActionResult CancelPostedInvoice()
        {
            return View();
        }
        //change invoice status
        [AbpAuthorize(PermissionNames.Ap_DataEntry_ChangeInvoiceStatus)]
        public ActionResult ChangeInvoiceStatus()
        {
            return View();
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CancelInvoices([FromBody] CancelInvoiceDto invoiceIds)
        {
            if (!await PermissionChecker.IsGrantedAsync(PermissionNames.Ap_DataEntry_CancelInvoices))
            {
                return Json(new
                {
                    success = false,
                    message = "You do not have permission to cancel invoices."
                });
            }

            var results = await _apInvoiceAppService.CancelInvoice(invoiceIds.InvoiceIds);

            return Json(new
            {
                success = true,
                data = results
            });
        }
        
        [AbpAuthorize(PermissionNames.Ap_DataEntry_ChangeInvoiceStatus)]
        public ActionResult EditPostedInvoice()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_DataEntry_EditPostedInvoice)]
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> EditPostedInvoices([FromBody] UpdateInvoiceInput input)
        {
            var result = await _apInvoiceAppService.EditPostedInvoice(input);
            return Json(result);
        }
        
        [AbpAuthorize(PermissionNames.Ap_DataEntry_Vouchers)]
        public async Task<ActionResult> Vouchers()
        {
            var result = await _companyProfileAppService.GetProfile();
            var profile = result as CompanyProfile;

            if (profile?.IsTaxLeviesInclusive == true)
            {
                TempData["Message"] = "Access to this page is denied!, Please raise vouchers from the enterprise data entry";
                
            }

            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_DataEntry_Vouchers)]
        public async Task<ActionResult> EditVouchers(Guid id)
        {
            var result = await _companyProfileAppService.GetProfile();
            var profile = result as CompanyProfile;

            if (profile?.IsTaxLeviesInclusive == true)
            {
                TempData["Message"] = "Access to this page is denied!, Please raise vouchers from the enterprise data entry";
                
            }
            ViewBag.VoucherId = id;
            return View();
        }
        


        //api for vouchers
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult>GetVouchers()
        {
            var result = await _apVoucherAppService.ListAll();
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateVoucher([FromBody] CreateApVoucherInput input)
        {
            var result = await _apVoucherAppService.Create(input);
            return Json(result);
        }
        
        public async Task<ActionResult> UpdateVoucher([FromBody] UpdateApVoucherInput input)
        {
            await _apVoucherAppService.Update(input);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteVoucher([FromQuery] Guid id)
        {
            if (!await PermissionChecker.IsGrantedAsync(PermissionNames.Ap_DataEntry_CancelPayments))
            {
                return Json(new
                {
                    success = false,
                    message = "You do not have permission to cancel payments."
                });
            }
            await _apVoucherAppService.Delete(id);
            return Json(new
            {
                success = true,
                data = 200
            });
            
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteMultipleVouchers([FromBody] List<Guid> ids)
        {
            if (!await PermissionChecker.IsGrantedAsync(PermissionNames.Ap_DataEntry_CancelPayments))
            {
                return Json(new
                {
                    success = false,
                    message = "You do not have permission to cancel payments."
                });
            }
            var results = await _apVoucherAppService.DeleteMultiple(ids);
            return Json(new
            {
                success = true,
                data = results
            });
        }
        
        [AbpAuthorize(PermissionNames.Ap_DataEntry_PostVouchers)]
        //POST VOUCHER
        public async Task<ActionResult> PostVouchers()
        {
            var result = await _companyProfileAppService.GetProfile();
            var profile = result as CompanyProfile;

            if (profile?.IsTaxLeviesInclusive == true)
            {
                TempData["Message"] = "Access to this page is denied!, Please post vouchers from the enterprise data entry";
                
            }

            return View();
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitPostVouchers([FromBody] PostVouchersDto postVouchers)
        {
            var results = await _apVoucherAppService.PostVouchers(postVouchers.VoucherIds);
            
            return Json(results);
        }
        [AbpAuthorize(PermissionNames.Ap_DataEntry_Payments)]
        //appaymets
        public ActionResult Payments()
        {
            return View();
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult>GetPayments()
        {
            var result = await _apPaymentAppService.ListAll();
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult>GetPaymentRecords()
        {
            var result = await _apPaymentAppService.ListAllPaymentRecords();
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        
        public async Task<ActionResult> CreatePayment([FromBody] CreateApPaymentInput input)
        {
            var result = await _apPaymentAppService.Create(input);
            return Json(result);
        }
        
        public async Task<ActionResult> UpdatePayment([FromBody] UpdateApPaymentInput input)
        {
            await _apPaymentAppService.Update(input);
            return Json(200);
        }
        public async Task<ActionResult> DeletePayment([FromQuery] Guid id)
        {
            await _apPaymentAppService.Delete(id);
            return Json(200);
        }
        //cancel payment
        public ActionResult CancelPayments()
        {
            return View();
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CancelPayment([FromBody] CancelPaymentDto paymentIds)
        {
            if (!await PermissionChecker.IsGrantedAsync(PermissionNames.Ap_DataEntry_CancelPayments))
            {
                return Json(new
                {
                    success = false,
                    message = "You do not have permission to cancel payments."
                });
            }

            var results = await _apPaymentAppService.CancelPayment(paymentIds.PaymentIds);

            return Json(new
            {
                success = true,
                data = results
            });
        }
        
        [AbpAuthorize(PermissionNames.Ap_DataEntry_PostPayments)]
        //POST PAYMENT
        public ActionResult PostPayment()
        {
            return View();
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitPostPayment([FromBody] PostPaymentDto postPayment)
        {
            var results = await _apPaymentAppService.PostPayments(postPayment.PaymentIds);
            
            return Json(results);
        }
        public ActionResult PaymentApproval()
        {
            return View();
        }
        
        [AbpAuthorize(PermissionNames.Ap_DataEntry_WithHoldingPayments)]
        //withholding
        public ActionResult WithHoldingPayments()
        {
            return View();
        }
        
        //api
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetWithHoldingPayments()
        {
            var result = await _apWithHoldingAppService.ListAll();
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateWithHoldingPayment([FromBody] CreateApWithHoldingInput input)
        {
            var result = await _apWithHoldingAppService.Create(input);
            return Json(result);
        }
        
        public async Task<ActionResult> UpdateWithHoldingPayment([FromBody] UpdateApWithHoldingInput input)
        {
            await _apWithHoldingAppService.Update(input);
            return Json(200);
        }
        
        public async Task<ActionResult> DeleteWithHoldingPayment([FromQuery] Guid id)
        {
            await _apWithHoldingAppService.Delete(id);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitPostWithHoldingPayment([FromBody] PostWithHoldingPaymentDto postWithHolding)
        {
            var results = await _apWithHoldingAppService.PostWithHoldings(postWithHolding.WithHoldingIds);
            
            return Json(results);
        }
        
        [AbpAuthorize(PermissionNames.Ap_DataEntry_DebitMemo)]
        public ActionResult ApplyDebitMemo(Guid id)
        {
            ViewBag.MemoId = id;
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_DataEntry_DebitMemo)]
        public ActionResult EditMemo(Guid id)
        {
            ViewBag.MemoId = id;
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_DataEntry_DebitMemo)]
        public ActionResult InitDebitMemo()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_DataEntry_DebitMemo)]
        public ActionResult CreateMemo()
        {
            return View();
        }
        //api for debit memo
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetDebitMemos()
        {
            var result = await _debitMemoAppService.ListAll();
            return Json(result);
        }
        
        
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateDebitMemo([FromBody] CreateDebitMemoInput input)
        {
            var result = await _debitMemoAppService.Create(input);
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateDebitMemo([FromBody] UpdateDebitMemoInput input)
        {
            var result =  await _debitMemoAppService.Update(input);
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> ApplyDebitMemoToInvoice([FromBody] UpdateDebitMemoInput input)
        {
         var result =  await _debitMemoAppService.Apply(input);
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteDebitMemo([FromQuery] Guid id)
        {
            await _debitMemoAppService.Delete(id);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetPaymentLastBatchNumber()
        {
            var result = await _apPaymentAppService.GenerateBatchNumberAsync();
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetMemoBatchNumber()
        {
            var result = await _debitMemoAppService.GenerateBatchNumberAsync();
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetPvBatchNumber()
        {
            var result = await _apVoucherAppService.GenerateBatchNumberAsync();
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetWithHoldingBatchNumber()
        {
            var result = await _apWithHoldingAppService.GenerateBatchNumberAsync();
            return Json(result);
        }
        
        //approveInvoice
        [AbpAuthorize(PermissionNames.Ap_DataEntry_ApproveInvoices)]
        public ActionResult ApproveInvoice()
        {
            return View();
        }
        
        //api to approve invoice
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InvoiceApproval([FromBody] ApproveInvoiceDto invoiceIds)
        {
            if (!await PermissionChecker.IsGrantedAsync(PermissionNames.Ap_DataEntry_ApproveInvoices))
            {
                return Json(new
                {
                    success = false,
                    message = "You do not have permission to approve invoices."
                });
            }

            var results = await _apInvoiceAppService.ApproveInvoice(invoiceIds.InvoiceIds);

            return Json(new
            {
                success = true,
                data = results
            });
        }

    }
    public class ApproveInvoiceDto
    {
        public List<Guid> InvoiceIds { get; set; }
    }

    public class CancelPaymentDto
    {
        public List<Guid> PaymentIds { get; set; }
    }
    public class CancelInvoiceDto
    {
        public List<Guid> InvoiceIds { get; set; }
    }
    
    
}