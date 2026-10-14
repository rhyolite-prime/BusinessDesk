using System;
using System.Threading.Tasks;
using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;
using TopazERP.DomainServices.SchoolManger.Dashboard;
using TopazERP.Services.Payroll.Dashboard;
using TopazERP.Services.Ap.Dashboard;
using TopazERP.Services.Ar.Dashboard;
using TopazERP.Services.SchoolManager.Dashboard;


namespace TopazERP.Web.Controllers;

public class DashboardController: TopazERPControllerBase
{
    private readonly IPayrollDashboardAppService _payrollDashboardAppService;
    private readonly IApDashboardAppService _apDashboardAppService;
    private readonly IArDashboardAppService _arDashboardAppService;
    private readonly IDashboardAppService _dashboardAppService;

    public DashboardController(IPayrollDashboardAppService payrollDashboardAppService, IApDashboardAppService apDashboardAppService,IArDashboardAppService arDashboardAppService, IDashboardAppService dashboardAppService)
    {
        _payrollDashboardAppService = payrollDashboardAppService;
        _apDashboardAppService = apDashboardAppService;
        _arDashboardAppService = arDashboardAppService;
        _dashboardAppService = dashboardAppService;
    }

    public IActionResult Payroll()
    {
        return View();
    }
    public IActionResult Ap()
    {
        return View();
    }
    
    public IActionResult Ar()
    {
        return View();
    }

    
    public IActionResult GeneralLedger()
    {
        return View();
    }
    
    public IActionResult SchoolManager()
    {
        return View();
    }
    
    
    //api
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetPayrollDashboardData()
    {
        var genderDistribution = await _payrollDashboardAppService.GetEmployeeGenderDistribution();
        var categoryDistribution = await _payrollDashboardAppService.GetEmployeeCategoryDistribution();
        var loanDistribution = await _payrollDashboardAppService.GetLoanDistribution();
        var loanPaymentDistribution = await _payrollDashboardAppService.GetLoanPaymentDistribution();
        
        return Json(new { genderDistribution, categoryDistribution, loanDistribution, loanPaymentDistribution });
    }
    
    //get ap data
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetApDashboardData()
    {
        //get resident distribution Data
        var residentDistribution = await _apDashboardAppService.GetSupplierResidentDistribution();
        //get supplier opening balance
        var supplierOpeningBalance = await _apDashboardAppService.GetSupplierOpeningBalance();
        //get supplier invoices
        var supplierInvoices = await _apDashboardAppService.GetSupplierInvoices();
        //payments
        var supplierPayments = await _apDashboardAppService.GetSupplierPayments();
        //all calculation
        var calculations = await _apDashboardAppService.GetCalculations();
        var invoiceAnalysis = await _apDashboardAppService.GetInvoiceAnalysis();

        return Json(new { residentDistribution, supplierOpeningBalance, supplierInvoices, supplierPayments, calculations, invoiceAnalysis });
    }

    
    //get ar data
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetArDashboardData()
    {
        //get customer Data
        var customerDistribution = await _arDashboardAppService.GetCustomerDistribution();
        //get supplier opening balance
        var customerOpeningBalance = await _arDashboardAppService.GetCustomerOpeningBalance();
        //get supplier invoices
        var customerInvoices = await _arDashboardAppService.GetCustomerInvoices();
        //payments
        var customerPayments = await _arDashboardAppService.GetCustomerPayments();
        //all calculation
        var calculations = await _arDashboardAppService.GetCalculations();
        var invoiceAnalysis = await _arDashboardAppService.GetInvoiceAnalysis();

        return Json(new
            {customerDistribution, customerOpeningBalance, customerInvoices, calculations, customerPayments, invoiceAnalysis});
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetSchFinanceDashboard()
    {
        var result = await _dashboardAppService.GetFinanceDashboard();

        return Ok(result);
    }
    [HttpGet]
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetStudentDebtors(Guid classId)
    {
        var result = await _dashboardAppService.GetStudentDebtors(classId);

        return Ok(result);
    }
}