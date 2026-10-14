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
using AutoMapper;
using TopazERP.Models.Ap;
using TopazERP.Services.Ar.OpeningBalances;
using TopazERP.Services.Ar.OpeningBalances.Dto;
using TopazERP.Services.Ar.ArInvoices;
using TopazERP.Services.Ar.ArInvoices.Dto;
using TopazERP.Services.Ar.ArPayments.Dto;
using TopazERP.Models.Ar;
using TopazERP.Services.Ar.ArCreditMemos;
using TopazERP.Services.Ar.ArCreditMemos.Dto;
using TopazERP.Services.Ar.ArPayments;
using TopazERP.Services.Ar.ArWithHoldingPayments.Dto;
using TopazERP.Services.Ar.ArWithHoldingPayments;
using TopazERP.Services.Ar.Quotations;
using TopazERP.Services.Ar.Quotations.Dto;


namespace TopazERP.Web.Controllers
{
    [AbpAuthorize(PermissionNames.Ar_DataEntry)]
    public class ArDataEntryController: TopazERPControllerBase
    {
        private readonly IArOpeningBalanceAppService _openingBalanceAppService;
        private readonly IArInvoiceAppService _arInvoiceAppService;
        private readonly IArPaymentAppService _arPaymentAppService;
        private readonly IArWithHoldingAppService _arWithHoldingAppService;
        private readonly IArCreditMemosAppService _arCreditMemosAppService;
        private readonly IQuotationsAppService _qotationAppService;
        
        public ArDataEntryController(IArOpeningBalanceAppService openingBalanceAppService, IArInvoiceAppService arInvoiceAppService, IArPaymentAppService arPaymentAppService, IArWithHoldingAppService arWithHoldingAppService, IArCreditMemosAppService arCreditMemosAppService, IQuotationsAppService quotationAppService, IMapper mapper)
        {
            _openingBalanceAppService = openingBalanceAppService;
            _arInvoiceAppService = arInvoiceAppService;
            _arPaymentAppService = arPaymentAppService;
            _arWithHoldingAppService = arWithHoldingAppService;
            _arCreditMemosAppService = arCreditMemosAppService; 
            _qotationAppService = quotationAppService;
        }
        
        [AbpAuthorize(PermissionNames.Ar_DataEntry_Payments)]
        public ActionResult AllPayments()
        {
            return View();
        }
        
        [AbpAuthorize(PermissionNames.Ar_DataEntry_Invoices)]
        public IActionResult ArInvoices()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_Invoices)]
        public IActionResult AddInvoice()
        {
            return View();
        }
        public ActionResult EditInvoice(Guid id, bool isPosted)
        {
            string permissionError = null;
            if (isPosted)
            {
                if (!PermissionChecker.IsGranted(PermissionNames.Ar_DataEntry_EditPostedInvoice))
                {
                    permissionError = "You do not have permission to edit posted invoices.";
                }
            }
            else
            {
                if (!PermissionChecker.IsGranted(PermissionNames.Ar_DataEntry_EditInvoice))
                {
                    permissionError = "You do not have permission to edit invoices.";
                }
            }

            ViewBag.InvoiceId = id;
            ViewBag.IsPosted = isPosted;
            ViewBag.PermissionError = permissionError;
            return View();
        }
        
        [AbpAuthorize(PermissionNames.Ar_DataEntry_OpeningBalances)]
        public IActionResult ArOpeningBalances()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_PostInvoices)]
        public ActionResult PostArInvoice()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_ChangeInvoiceStatus)]
        public ActionResult ChangeInvoiceStatus()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_CancelInvoices)]
        public ActionResult CancelUnpostedInvoices()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_ChangeInvoiceStatus)]
        public ActionResult EditPostedInvoice()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_ChangeInvoiceStatus)]
        public ActionResult CancelPostedInvoices()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_CreatePayments)]
        public ActionResult InvoicePayments()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_CancelPayments)]
        public ActionResult CancelInvoicePayments()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_PostPayments)]
        public ActionResult PostInvoicePayments()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_WithHoldingPayments)]
        public ActionResult ArWithHoldingPayments()
        {
            return View();
        }
        
        [AbpAuthorize(PermissionNames.Ar_DataEntry_CreditMemo)]
        public ActionResult ArCreditMemo()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_CreditMemo)]
        public ActionResult CreateMemo()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_CreditMemo)]
        public ActionResult EditMemo(Guid id)
        {
            ViewBag.MemoId = id;
            return View();
        }
        
        [AbpAuthorize(PermissionNames.Ar_DataEntry_CreditMemo)]
        public ActionResult ApplyCreditMemo(Guid id)
        {
            ViewBag.MemoId = id;
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_CreditMemo)]
        public ActionResult CancelCreditMemo()
        {
            return View();
        }
        
        
        [AbpAuthorize(PermissionNames.Ar_DataEntry_Quotations)]
        public ActionResult Quotations()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_EditPayments)]
        public ActionResult EditPayment(Guid id)
        {
            ViewBag.PaymentId = id;
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_OpeningBalances)]
        public ActionResult CreateBalance()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_OpeningBalances)]
        public ActionResult EditBalance(Guid id)
        {
            ViewBag.BalanceId = id;
            return View();
        }
        [AbpAuthorize(PermissionNames.Ar_DataEntry_OpeningBalances)]
        public ActionResult PostBalance()
        {
            return View();
        }
        //ar invoice api
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetOpeningBalances()
        {
            var result = await _openingBalanceAppService.ListAll();
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateOpeningBalances([FromBody] CreateArOpeningBalanceInput input)
        {
            var result = await _openingBalanceAppService.Create(input);
            return Json(result);
        }
        
        
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateOpeningBalances([FromBody] UpdateArOpeningBalanceInput input)
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
        public async Task<ActionResult> InitPostArBalances([FromBody] PostArBalanceDto postBalance)
        {
            var results = await _openingBalanceAppService.PostArOpeningBalances(postBalance.BalanceIds);
            
            return Json(results);
        }
        
        
        //get opening balances with is_posted = true
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetPostedOpeningBalances()
        {
            var result = await _openingBalanceAppService.GetPostedOpeningBalances();
            return Json(result);
        }
        
        //api for invoices
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetInvoices()
        {
            var result = await _arInvoiceAppService.ListAll();
            return Json(result);
        }
        

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateInvoice([FromBody] CreateArInvoiceInput input)
        {
            var result = await _arInvoiceAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateInvoice([FromBody] UpdateArInvoiceInput input)
        {
            await _arInvoiceAppService.Update(input);
            return Json(200);

        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> EditPostedInvoices([FromBody] UpdateArInvoiceInput input)
        {
            var result = await _arInvoiceAppService.EditPostedInvoice(input);
            return Json(result);
        }
        
       
        //post invoice
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitPostInvoice([FromBody] PostArInvoiceDto postInvoice)
        {
            var results = await _arInvoiceAppService.PostInvoice(postInvoice.InvoiceIds);
            
            return Json(results);
        }
       
       
       
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CancelInvoices([FromBody] CancelArInvoiceDto invoiceIds)
        {
            if (!await PermissionChecker.IsGrantedAsync(PermissionNames.Ar_DataEntry_CancelInvoices))
            {
                return Json(new
                {
                    success = false,
                    message = "You do not have permission to cancel invoices."
                });
            }

            var results = await _arInvoiceAppService.CancelInvoice(invoiceIds.InvoiceIds);

            return Json(new
            {
                success = true,
                data = results
            });
        }
        //api for invoicepayments
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetInvoicePayments()
        {
            var result = await _arPaymentAppService.ListAll();
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult>GetPaymentRecords()
        {
            var result = await _arPaymentAppService.ListAllPaymentRecords();
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateInvoicePayment([FromBody] CreateArPaymentInput input)
        {
            var result = await _arPaymentAppService.Create(input);
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateInvoicePayment([FromBody] UpdateArPaymentInput input)
        {
            await _arPaymentAppService.Update(input);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteInvoicePayment(Guid id)
        {
            await _arPaymentAppService.Delete(id);
            return Json(200);
        }
        
        //post invoice payments
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitPostInvoicePayments([FromBody] PostArPaymentDto postPayment)
        {
            var results = await _arPaymentAppService.PostPayments(postPayment.PaymentIds);
            
            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CancelPayment([FromBody] CancelArPaymentDto paymentIds)
        {
            if (!await PermissionChecker.IsGrantedAsync(PermissionNames.Ar_DataEntry_CancelPayments))
            {
                return Json(new
                {
                    success = false,
                    message = "You do not have permission to cancel payments."
                });
            }

            var results = await _arPaymentAppService.CancelPayment(paymentIds.PaymentIds);

            return Json(new
            {
                success = true,
                data = results
            });
        }
        //withholdings api
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetWithHoldingPayments()
        {
            var result = await _arWithHoldingAppService.ListAll();
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateWithHoldingPayment([FromBody] CreateArWithHoldingInput input)
        {
            var result = await _arWithHoldingAppService.Create(input);
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateWithHoldingPayment([FromBody] UpdateArWithHoldingInput input)
        {
            await _arWithHoldingAppService.Update(input);
            return Json(200);
        }
        public async Task<ActionResult> DeleteWithHoldingPayment([FromQuery] Guid id)
        {
            await _arWithHoldingAppService.Delete(id);
            return Json(200);
        }
        
        //post invoice payments
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitPostWithHoldingPayments([FromBody] PostArWithHoldingPaymentDto postPayment)
        {
            var results = await _arWithHoldingAppService.PostWithHoldings(postPayment.WithHoldingIds);
            
            return Json(results);
        }
        
        //api for credit memos
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetCreditMemo()
        {
            var result = await _arCreditMemosAppService.ListAll();
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateCreditMemo([FromBody] CreateArCreditMemoInput input)
        {
            var result = await _arCreditMemosAppService.Create(input);
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> ApplyArCreditMemo([FromBody] UpdateArCreditMemoInput input)
        {
            var result = await _arCreditMemosAppService.Apply(input);
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateCreditMemo([FromBody] UpdateArCreditMemoInput input)
        {
           var result = await _arCreditMemosAppService.Update(input);
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteCreditMemo(Guid id)
        {
           var result = await _arCreditMemosAppService.Delete(id);
            return Json(result);
        }

        //api for quotations
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetQuotations()
        {
            var result = await _qotationAppService.ListAll();
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateQuotation([FromBody] CreateQuotationsInput input)
        {
            var result = await _qotationAppService.Create(input);
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateQuotation([FromBody] UpdateQuotaionsInput input)
        {
            var result = await _qotationAppService.Update(input);
            return Json(result);
        }
      
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteQuotation(Guid id)
        {
           var result = await _qotationAppService.Delete(id);
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetPaymentBatchNumber()
        {
            var result = await _arPaymentAppService.GenerateBatchNumberAsync();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetWithHoldingBatchNumber()
        {
            var result = await _arWithHoldingAppService.GenerateBatchNumberAsync();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetCreditMemoBatchNumber()
        {
            var result = await _arCreditMemosAppService.GenerateBatchNumberAsync();
            return Json(result);
        }
        //approveInvoice
        [AbpAuthorize(PermissionNames.Ar_DataEntry_ApproveInvoices)]
        public ActionResult ApproveInvoice()
        {
            return View();
        }
        
        //api to approve invoice
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InvoiceApproval([FromBody] ApproveInvoiceDto invoiceIds)
        {
            if (!await PermissionChecker.IsGrantedAsync(PermissionNames.Ar_DataEntry_ApproveInvoices))
            {
                return Json(new
                {
                    success = false,
                    message = "You do not have permission to approve invoices."
                });
            }

            var results = await _arInvoiceAppService.ApproveInvoice(invoiceIds.InvoiceIds);

            return Json(new
            {
                success = true,
                data = results
            });
        }
        public class ApproveInvoiceDto
        {
            public List<Guid> InvoiceIds { get; set; }
        }
    }
}

