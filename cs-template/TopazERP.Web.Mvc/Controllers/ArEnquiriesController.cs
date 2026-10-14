using Abp.Authorization;
using TopazERP.Controllers;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Authorization;

namespace TopazERP.Web.Controllers;
[AbpAuthorize(PermissionNames.Ar_Enquiries)]
[Abp.AspNetCore.Mvc.Authorization.AbpMvcAuthorize]

public class ArEnquiriesController: TopazERPControllerBase
{
    [AbpAuthorize(PermissionNames.Ar_Enquiries)]
    public IActionResult CustomerList()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Ar_Enquiries)]
    public IActionResult ArInvoiceList()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Ar_Enquiries)]
    public IActionResult ArOpeningBalances()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Ar_Enquiries_CanceledInvoices)]
    public IActionResult CanceledInvoices()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Ar_Enquiries)]
    public IActionResult InvoicePayments()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Ar_Enquiries_CanceledPayments)]
    public IActionResult CanceledInvoicePayments()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Ar_Enquiries)]
    public IActionResult WithHoldingPayments()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Ar_Enquiries)]
    public IActionResult CreditMemo()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Ar_Enquiries)]
    public IActionResult Aging()
    {
        return View();
    }
    
    [AbpAuthorize(PermissionNames.Ar_Enquiries)]
    public IActionResult Quotations()
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
    
}