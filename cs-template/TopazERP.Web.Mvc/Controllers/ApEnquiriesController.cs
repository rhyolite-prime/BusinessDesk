using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;
using Abp.Authorization;
using TopazERP.Authorization;
using System.Threading.Tasks;
using TopazERP.Services.Ap.OpeningBalances;
using TopazERP.Services.Ap.ApInvoices;
using TopazERP.Services.Ap.ApVouchers;
using TopazERP.Services.Ap.ApPayment;
using TopazERP.Services.Ap.ApWithHoldingPayments;
using TopazERP.Services.Shared.Suppliers;



namespace TopazERP.Web.Controllers
{
    [AbpAuthorize(PermissionNames.Ap_Enquiries)]
    
    public class ApEnquiriesController : TopazERPControllerBase
    {
        private readonly ISupplierAppService _supplierAppService;
        private readonly IOpeningBalanceAppService _openingBalanceAppService;
        private readonly IApInvoiceAppService _apInvoiceAppService;
        private readonly IApVoucherAppService _apVoucherAppService;
        private readonly IApPaymentAppService _apPaymentAppService;
        private readonly IApWithHoldingAppService _apWithHoldingAppService;
        public ApEnquiriesController(IOpeningBalanceAppService openingBalanceAppService, IApInvoiceAppService apInvoiceAppService, IApVoucherAppService apVoucherAppService, IApPaymentAppService apPaymentAppService, IApWithHoldingAppService apWithHoldingAppService, ISupplierAppService supplierAppService)
        {
            _supplierAppService = supplierAppService;
            _openingBalanceAppService = openingBalanceAppService;
            _apInvoiceAppService = apInvoiceAppService;
            _apVoucherAppService = apVoucherAppService;
            _apPaymentAppService = apPaymentAppService;
            _apWithHoldingAppService = apWithHoldingAppService;
        }
     
       
        [AbpAuthorize(PermissionNames.Ap_Enquiries_InvoiceList)]
        public ActionResult InvoiceList()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Ap_Enquiries)]
        public ActionResult SuppliersList()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_Enquiries_CanceledInvoices)]
        public ActionResult CanceledInvoices()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_Enquiries_CanceledPayments)]
        public ActionResult CanceledPayments()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_Enquiries)]
        public ActionResult PaymentHistory()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_Enquiries)]
        public ActionResult OpeningBalances()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_Enquiries)]
        public ActionResult WithHolding()
        {
            return View();
        }
        
        [AbpAuthorize(PermissionNames.Ap_Enquiries)]
        public ActionResult DebitMemo()
        {
            return View();
        }
        
        [AbpAuthorize(PermissionNames.Ap_Enquiries)]
        public ActionResult Aging()
        {
            return View();
        }
        
        [AbpAuthorize(PermissionNames.Ap_Enquiries)]
        public ActionResult Vouchers()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_Enquiries)]
        public ActionResult ApprovedInvoices()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_Enquiries)]
        public ActionResult UnapprovedInvoices()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Ap_Enquiries)]
        public ActionResult PaidInvoices()
        {
            return View();
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetInvoices()
        {
            var result = await _apInvoiceAppService.ListAll();
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetSuppliers()
        {
            var result = await _supplierAppService.ListAll();
            return Json(result);
        }
        
    }
}