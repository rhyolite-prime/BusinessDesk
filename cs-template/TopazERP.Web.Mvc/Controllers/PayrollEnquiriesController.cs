using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;
using System.Threading.Tasks;
using System;
using Abp.Authorization;
using TopazERP.Authorization;
using TopazERP.Services.Payroll.EmployeeAllowances;
using TopazERP.Services.Payroll.EmployeeDeductions;
using TopazERP.Services.Payroll.EmployeeBioDatas;
using TopazERP.Services.Payroll.EmployeeOnetimeDeductions;
using TopazERP.Services.Payroll.EmployeeSalaryInfos;
using TopazERP.Services.Payroll.SalaryIncrements;
using TopazERP.Services.Payroll.EmployeeBenefitInKinds;
using TopazERP.Services.Payroll.EmployeeReliefs;
using TopazERP.Services.Payroll.EmployeeLoans;
using TopazERP.Services.Payroll.EmployeeLoanRepaymentSchedules;
using TopazERP.Services.Payroll.EmployeeSalaryAdvances;
using TopazERP.Services.Payroll.EmployeeSnits;
using TopazERP.Services.Payroll.MonthlySsnitDeductionHistory;
using TopazERP.Services.Payroll.ProcessPay;

namespace TopazERP.Web.Controllers
{
    [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries)]
    public class PayrollEnquiriesController : TopazERPControllerBase
    {
        private readonly IEmployeeAllowanceAppService _employeeAllowanceAppService;
        private readonly IEmployeeDeductionAppService _employeeDeductionAppService;
        private readonly IEmployeeBioDataAppService _employeeBioDataAppService;
        private readonly IEmployeeOnetimeDeductionAppService _employeeOnetimeDeductionAppService;
        private readonly IEmployeeSalaryInfoAppService _employeeSalaryInfoAppService;
        private readonly ISalaryIncrementAppService _salaryIncrementAppService;
        private readonly IEmployeeBenefitInKindAppService _employeeBenefitInKindAppService;
        private readonly IEmployeeReliefAppService _employeeReliefAppService;
        private readonly IEmployeeLoanAppService _employeeLoanAppService;
        private readonly IEmployeeLoanRepaymentScheduleAppService _employeeLoanRepaymentScheduleAppService;
        private readonly IEmployeeSalaryAdvanceAppService _employeeSalaryAdvanceAppService;
        private readonly IEmployeeSnitAppService _employeeSnitAppService;
        private readonly IMonthlySsnitDeductionHistAppService _monthlySsnitDeductionHistAppService;
        private readonly IProcessPayAppService _processPayAppService;
        public PayrollEnquiriesController(IEmployeeAllowanceAppService employeeAllowanceAppService, IEmployeeDeductionAppService employeeDeductionAppService, IEmployeeBioDataAppService employeeBioDataAppService, IEmployeeOnetimeDeductionAppService employeeOnetimeDeductionAppService, IEmployeeSalaryInfoAppService employeeSalaryInfoAppService, ISalaryIncrementAppService salaryIncrementAppService, IEmployeeBenefitInKindAppService employeeBenefitInKindAppService, IEmployeeReliefAppService employeeReliefAppService, IEmployeeLoanAppService employeeLoanAppService, IEmployeeLoanRepaymentScheduleAppService employeeLoanRepaymentScheduleAppService, IEmployeeSalaryAdvanceAppService employeeSalaryAdvanceAppService, IEmployeeSnitAppService employeeSnitAppService, IMonthlySsnitDeductionHistAppService monthlySsnitDeductionHistAppService, IProcessPayAppService processPayAppService)
        {
            _employeeAllowanceAppService = employeeAllowanceAppService;
            _employeeDeductionAppService = employeeDeductionAppService;
            _employeeBioDataAppService = employeeBioDataAppService;
            _employeeOnetimeDeductionAppService = employeeOnetimeDeductionAppService;
            _employeeSalaryInfoAppService = employeeSalaryInfoAppService;
            _salaryIncrementAppService = salaryIncrementAppService;
            _employeeBenefitInKindAppService = employeeBenefitInKindAppService;
            _employeeReliefAppService = employeeReliefAppService;
            _employeeLoanAppService = employeeLoanAppService;
            _employeeLoanRepaymentScheduleAppService = employeeLoanRepaymentScheduleAppService;
            _employeeSalaryAdvanceAppService = employeeSalaryAdvanceAppService;
            _employeeSnitAppService = employeeSnitAppService;
            _monthlySsnitDeductionHistAppService = monthlySsnitDeductionHistAppService;
            _processPayAppService = processPayAppService;
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_EmployeeDirectory)]
        public IActionResult EmployeesDirectory()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_EmployeeAllowances)]
        public IActionResult EmployeeAllowances()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_EmployeeDeductions)]
        public IActionResult EmployeeDeductions()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_EmployeeOnetimeDeductions)]
        public IActionResult EmployeeOnetimeDeductions()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_EmployeeSalaryInfo)]
        public IActionResult EmployeeSalaryInfo()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_SalaryIncrementHistory)]
        public IActionResult SalaryIncrementHistory()
        {
            return View();
        }


        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_EmployeeBenefitsInKind)]
        public IActionResult EmployeeBenefitsInKind()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_EmployeeTaxReliefs)]
        public IActionResult EmployeeTaxReliefs()
        {
            return View();
        }


        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_EmployeeOutstandingLoans)]
        public IActionResult OutstandingLoans()
        {
            return View();
        }


        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_EmployeeSalaryAdvance)]
        public IActionResult EmployeeSalaryAdvance()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_PastLoans)]
        public IActionResult PastLoans()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_EmployeeProvidentFund)]
        public IActionResult EmployeeProvidentFund()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_SsfContributions)]
        public IActionResult SsfContributions()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_PastSsfContributions)]
        public IActionResult PastSsfContributions()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollEnquiries_PayrollTransactions)]
        public IActionResult PayrollTransactions()
        {
            return View();
        }
        

        //api..
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeAllowances()
        {
            var results = await _employeeAllowanceAppService.ListAll();

            return Json(results);
        }


        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeDeductions()
        {
            var results = await _employeeDeductionAppService.ListAll();

            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetOnetimeDeductions()
        {
            var employees = await _employeeBioDataAppService.ListAll();

            var onetimeDeduction = await _employeeOnetimeDeductionAppService.ListAll();

            return Json(new { employees, onetimeDeduction });
        }


        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeesSalaryInfo()
        {
            var results = await _employeeSalaryInfoAppService.ListAll();
            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetSalaryIncrementHistory()
        {
            var results = await _salaryIncrementAppService.ListAll();

            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeesBik()
        {
            var employeeBik = await _employeeBenefitInKindAppService.ListAll();

            var employees = await _employeeBioDataAppService.ListAll();

            return Json(new { employeeBik, employees });
        }


        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeTaxReliefs()
        {
            var employeeTaxReliefs = await _employeeReliefAppService.ListAll();

            var employees = await _employeeBioDataAppService.ListAll();

            return Json(new { employeeTaxReliefs, employees });
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetOutstandingLoans()
        {
            var results = await _employeeLoanAppService.ListOutStandingLoans();

            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetPastLoans()
        {
            var loans = await _employeeLoanAppService.ListPastLoans();

            var repaymentSchedule = await _employeeLoanRepaymentScheduleAppService.ListAll();

            return Json(new { loans, repaymentSchedule });
        }
        

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeSalaryAdvances()
        {
            var results = await _employeeSalaryAdvanceAppService.ListAll();

            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeSsnitInfo()
        {
            var results = await _employeeSnitAppService.ListAll();

            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetPastSsfContributions([FromQuery]int month, int year)
        {
            var results = await _monthlySsnitDeductionHistAppService.ListAll(month, year);

            return Json(results);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetPayrollResults()
        {
            var results = await _processPayAppService.GetPayrollResults();
            return Json(results);
        }

    }
}
