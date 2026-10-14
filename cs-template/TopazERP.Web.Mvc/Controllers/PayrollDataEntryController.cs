using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;
using TopazERP.Services.Payroll.EmployeeBioDatas;
using System.Threading.Tasks;
using System;
using System.Dynamic;
using Abp.Authorization;
using TopazERP.Authorization;
using TopazERP.Services.Payroll.EmployeeBioDatas.Dto;
using TopazERP.Services.Payroll.EmployeeSalaryInfos;
using TopazERP.Services.Payroll.EmployeeSalaryInfos.Dto;
using TopazERP.Services.Payroll.EmployeeDaysWorkeds;
using TopazERP.Services.Payroll.EmployeeDaysWorkeds.Dto;
using TopazERP.Services.Payroll.BonusAndOnetimeAllowances;
using TopazERP.Services.Payroll.AllowanceTypes;
using TopazERP.Services.Payroll.BonusAndOnetimeAllowances.Dto;
using TopazERP.Web.Models.Dto;
using TopazERP.Services.Payroll.EmployeeSnits.Dto;
using TopazERP.Services.Payroll.EmployeeSnits;
using TopazERP.Services.Payroll.EmployeeDeductions;
using TopazERP.Services.Payroll.DeductionTypes;
using TopazERP.Services.Payroll.EmployeeDeductions.Dto;
using TopazERP.Services.Payroll.EmployeeAllowances;
using TopazERP.Services.Payroll.EmployeeAllowances.Dto;
using TopazERP.Services.Payroll.EmployeeBenefitInKinds;
using TopazERP.Services.Payroll.BikTypes;
using TopazERP.Services.Payroll.EmployeeBenefitInKinds.Dto;
using TopazERP.Services.Payroll.EmployeeLoans.Dto;
using TopazERP.Services.Payroll.EmployeeLoans;
using TopazERP.Services.Payroll.EmployeeSalaryAdvances.Dto;
using TopazERP.Services.Payroll.EmployeeSalaryAdvances;
using TopazERP.Services.Payroll.EmployeeOnetimeDeductions;
using TopazERP.Services.Payroll.EmployeeOnetimeDeductions.Dto;
using TopazERP.Services.Payroll.TaxReliefs;
using TopazERP.Services.Payroll.EmployeeReliefs;
using TopazERP.Services.Payroll.EmployeeReliefs.Dto;
using TopazERP.Services.Payroll.OvertimeTimeSheets;
using TopazERP.Services.Payroll.OvertimeTimeSheets.Dto;
using TopazERP.Services.Payroll.OvertimeTypes;
using TopazERP.Services.Payroll.EmployeeLoanRepaymentSchedules;
using TopazERP.DomainServices.Payroll.EmployeeLoans.Dto;

namespace TopazERP.Web.Controllers
{
    [AbpAuthorize(PermissionNames.Payroll_DataEntry)]
    public class PayrollDataEntryController : TopazERPControllerBase
    {
        private readonly IEmployeeBioDataAppService _employeeBioDataAppService;
        private readonly IEmployeeSalaryInfoAppService _employeeSalaryInfoAppService;
        private readonly IEmployeeDayWorkedAppService _employeeDayWorkedAppService;
        private readonly IBonusAndOnetimeAllowanceAppService _bonusAndOnetimeAllowanceAppService;
        private readonly IAllowanceTypeAppService _allowanceTypeAppService;
        private readonly IEmployeeSnitAppService _employeeSnitAppService;
        private readonly IEmployeeDeductionAppService _employeeDeductionAppService;
        private readonly IDeductionTypeAppService _deductionTypeAppService;
        private readonly IEmployeeAllowanceAppService _employeeAllowanceAppService;
        private readonly IEmployeeBenefitInKindAppService _employeeBenefitInKindAppService;
        private readonly IBikTypeAppService _bikTypeAppService;
        private readonly IEmployeeLoanAppService _employeeLoanAppService;
        private readonly IEmployeeSalaryAdvanceAppService _employeeSalaryAdvanceAppService;
        private readonly IEmployeeOnetimeDeductionAppService _employeeOnetimeDeductionAppService;
        private readonly ITaxReliefAppService _taxReliefAppService;
        private readonly IEmployeeReliefAppService _employeeReliefAppService;
        private readonly IOvertimeTimeSheetAppService _overtimeTimeSheetAppService;
        private readonly IEmployeeLoanRepaymentScheduleAppService _employeeLoanRepaymentScheduleAppService;
        private readonly IOvertimeTypeAppService _overtimeTypeAppService;

        public PayrollDataEntryController(IEmployeeBioDataAppService employeeBioDataAppService, IEmployeeSalaryInfoAppService employeeSalaryInfoAppService, IEmployeeDayWorkedAppService employeeDayWorkedAppService, IBonusAndOnetimeAllowanceAppService bonusAndOnetimeAllowanceAppService, IAllowanceTypeAppService allowanceTypeAppService, IEmployeeSnitAppService employeeSnitAppService, IEmployeeDeductionAppService employeeDeductionAppService, IDeductionTypeAppService deductionTypeAppService, IEmployeeAllowanceAppService employeeAllowanceAppService, IEmployeeBenefitInKindAppService employeeBenefitInKindAppService, IBikTypeAppService bikTypeAppService, IEmployeeLoanAppService employeeLoanAppService, IEmployeeSalaryAdvanceAppService employeeSalaryAdvanceAppService, IEmployeeOnetimeDeductionAppService employeeOnetimeDeductionAppService, ITaxReliefAppService taxReliefAppService, IEmployeeReliefAppService employeeReliefAppService, IOvertimeTimeSheetAppService overtimeTimeSheetAppService, IEmployeeLoanRepaymentScheduleAppService employeeLoanRepaymentScheduleAppService, IOvertimeTypeAppService overtimeTypeAppService)
        {
            _employeeBioDataAppService = employeeBioDataAppService;
            _employeeSalaryInfoAppService = employeeSalaryInfoAppService;
            _employeeDayWorkedAppService = employeeDayWorkedAppService;
            _bonusAndOnetimeAllowanceAppService = bonusAndOnetimeAllowanceAppService;
            _allowanceTypeAppService = allowanceTypeAppService;
            _employeeSnitAppService = employeeSnitAppService;
            _employeeDeductionAppService = employeeDeductionAppService;
            _deductionTypeAppService = deductionTypeAppService;
            _employeeAllowanceAppService = employeeAllowanceAppService;
            _employeeBenefitInKindAppService = employeeBenefitInKindAppService;
            _bikTypeAppService = bikTypeAppService;
            _employeeLoanAppService = employeeLoanAppService;
            _employeeSalaryAdvanceAppService = employeeSalaryAdvanceAppService;
            _employeeOnetimeDeductionAppService = employeeOnetimeDeductionAppService;
            _taxReliefAppService = taxReliefAppService;
            _employeeReliefAppService = employeeReliefAppService;
            _overtimeTimeSheetAppService = overtimeTimeSheetAppService;
            _employeeLoanRepaymentScheduleAppService = employeeLoanRepaymentScheduleAppService;
            _overtimeTypeAppService = overtimeTypeAppService;
        }

        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EmployeeDaysWorked)]
        public IActionResult EmployeeDaysWorked()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EmployeeBonusAndOneTimeAllowance)]
        public IActionResult BonusOnetimeAllowance()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EmployeeBioData)]
        public IActionResult EmployeeBioData()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EmployeeSalaryInfo)]
        public IActionResult EmployeeSalaryInfo()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EmployeeSnit)]
        public IActionResult EmployeeSsnit()
        {
            return View();
        }
        
        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EmployeeDeductions)]
        public IActionResult EmployeeDeductions()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EmployeeBenefitsInKind)]
        public IActionResult EmployeeBenefitsInKind()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EmployeeLoans)]
        public IActionResult EmployeeLoans()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EmployeeSalaryAdvance)]
        public IActionResult EmployeeSalaryAdvance()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EmployeeOnetimeDeduction)]
        public IActionResult OnetimeDeduction()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EmployeeAllowances)]
        public IActionResult EmployeeAllowances()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EmployeeReliefs)]
        public IActionResult EmployeeReliefs()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EmployeeOvertime)]
        public IActionResult EmployeeOvertime()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_DataEntry_UpdateEmployeeStatus)]
        public IActionResult UpdateEmployeeStatus()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EmployeeLoanApprovals)]
        public IActionResult EmployeeLoanApprovals()
        {
            return View();
        }
        
        [AbpAuthorize(PermissionNames.Payroll_DataEntry_SalaryAdvanceApprovals)]
        public IActionResult SalaryAdvanceApprovals()
        {
            return View();
        }
         
        
        [AbpAuthorize(PermissionNames.Payroll_DataEntry_LoanAmortization)]
        public IActionResult LoanAmortization()
        {
            return View();
        }
        
        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EditEmployeeLoan)]
        public IActionResult EditUnpaidLoan(Guid id)
        {
            dynamic viewmodel = new ExpandoObject();
            viewmodel.Id = id;
            return View(viewmodel);
        }
        
        [AbpAuthorize(PermissionNames.Payroll_DataEntry_EditEmployeeSalaryAdvance)]
        public IActionResult EditSalaryAdvance(Guid id)
        {
            dynamic viewmodel = new ExpandoObject();
            viewmodel.Id = id;
            return View(viewmodel);
        }
        
        
        
        //api

        //employee days work
        public async Task<ActionResult> CreateEmployeeDaysWorked([FromBody] CreateEmployeeDaysWorkedInput input)
        {
            await _employeeDayWorkedAppService.Create(input);
            return Json(200);

        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitializeEmployeesDaysWorked([FromQuery] int month, int year, string salaryType)
        {
            var results = await _employeeDayWorkedAppService.ListAll(month, year, salaryType);
            return Json(results);
        }

        // employees
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployees()
        {
            var results = await _employeeBioDataAppService.ListAll();
            return Json(results);
        }


        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateEmployee([FromBody] CreateEmployeeBioDataInput input)
        {
            var result = await _employeeBioDataAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateEmployee([FromBody] UpdateEmployeeBioDataInput input)
        {
            await _employeeBioDataAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelEmployee([FromQuery] Guid id)
        {
            await _employeeBioDataAppService.Delete(id);
            return Json(200);
        }

        //salary info
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeSalaryInfo([FromQuery] Guid employeeId)
        {
            var results = await _employeeSalaryInfoAppService.GetAsync(employeeId);

            return Json(results);
        }
        


        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateEmployeeSalaryInfo([FromBody] CreateEmployeeSalaryInfoInput input)
        {
            await _employeeSalaryInfoAppService.Create(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateEmployeeSalaryInfo([FromBody] UpdateEmployeeSalaryInfoInput input)
        {
            await _employeeSalaryInfoAppService.Update(input);
            return Json(200);
        }

        //bonus and one time allowance ...
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetBonusEmployees([FromQuery] int month, int year)
        {
            var employees = await _employeeBioDataAppService.ListAll();
            var bonusAndOnetimeAllowances = await _bonusAndOnetimeAllowanceAppService.ListAll(month, year);
            var allowances = await _allowanceTypeAppService.ListAll();

            return Json(new { employees , bonusAndOnetimeAllowances , allowances });
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateBonusAndOnetimeAllowance([FromBody] CreateBonusAndOnetimeAllowanceInput input)
        {
             await _bonusAndOnetimeAllowanceAppService.Create(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateBulkBonusAndOnetimeAllowance([FromBody] BulkBonusAndOnetimeAllowanceInput input)
        {
            foreach (CreateBonusAndOnetimeAllowanceInput bonus in input.BonusList)
            {
                 await _bonusAndOnetimeAllowanceAppService.Create(bonus);
            }

            return Json(200);
        }

        public async Task<ActionResult> UpdateBonusAndOnetimeAllowance([FromBody] UpdateBonusAndOnetimeAllowanceInput input)
        {
            await _bonusAndOnetimeAllowanceAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelBonusAndOnetimeAllowance([FromQuery] Guid id)
        {
            await _bonusAndOnetimeAllowanceAppService.Delete(id);
            return Json(200);
        }

        //ssnit

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateEmployeeSsnit([FromBody] CreateEmployeeSnitInput input)
        {
            await _employeeSnitAppService.Create(input);
            return Json(200);
        }

        public async Task<ActionResult> UpdateEmployeeSsnit([FromBody] UpdateEmployeeSnitInput input)
        {
            await _employeeSnitAppService.Update(input);
            return Json(200);
        }


        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeSsnitInfo([FromQuery] Guid employeeId)
        {
            var results = await _employeeSnitAppService.GetAsync(employeeId);

            return Json(results);
        }

        //employee deductions
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeDeductions([FromQuery] Guid employeeId, Guid categoryId)
        {
            var employeeDeductions = await _employeeDeductionAppService.ListAll(employeeId);
            var deductionTypes = await _deductionTypeAppService.GetByCategory(categoryId);

            return Json(new { employeeDeductions , deductionTypes });
        }


        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetDeductionRate([FromQuery] Guid deductionTypeId, Guid employeeId, Guid categoryId)
        {
            var result = await _deductionTypeAppService.ListAll(deductionTypeId, employeeId, categoryId);

            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateEmployeeDeduction([FromBody] CreateEmployeeDeductionInput input)
        {
            var result = await _employeeDeductionAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateEmployeeDeduction([FromBody] UpdateEmployeeDeductionInput input)
        {
            await _employeeDeductionAppService.Update(input);
            return Json(200);

        }
        public async Task<ActionResult> DelEmployeeDeduction([FromQuery] Guid id)
        {
            await _employeeDeductionAppService.Delete(id);
            return Json(200);
        }

        //employee allowances
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeAllowances([FromQuery] Guid employeeId, Guid categoryId)
        {
            var employeeAllowances = await _employeeAllowanceAppService.ListAll(employeeId);
            var allowanceTypes = await _allowanceTypeAppService.GetByCategory(categoryId);

            return Json(new { employeeAllowances, allowanceTypes });
        }


        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetAllowanceRate([FromQuery] Guid allowanceTypeId, Guid employeeId, Guid categoryId)
        {
            var result = await _allowanceTypeAppService.ListAll(allowanceTypeId, employeeId, categoryId);
            return Json(result);
        }


        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateEmployeeAllowance([FromBody] CreateEmployeeAllowanceInput input)
        {
            var result = await _employeeAllowanceAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateEmployeeAllowance([FromBody] UpdateEmployeeAllowanceInput input)
        {
            await _employeeAllowanceAppService.Update(input);
            return Json(200);

        }
        public async Task<ActionResult> DelEmployeeAllowance([FromQuery] Guid id)
        {
            await _employeeAllowanceAppService.Delete(id);
            return Json(200);
        }

        //employee bik
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeBik([FromQuery] Guid employeeId)
        {
            var employeeBik = await _employeeBenefitInKindAppService.ListAll(employeeId);

            var bikTypes = await _bikTypeAppService.ListAll();

            return Json(new { employeeBik, bikTypes });
        }


        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetBikRate([FromQuery] Guid bikTypeId, Guid employeeId, Guid categoryId)
        {
            var result = await _bikTypeAppService.ListAll(bikTypeId, employeeId, categoryId);

            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateEmployeeBik([FromBody] CreateEmployeeBenefitInKindInput input)
        {
            var result = await _employeeBenefitInKindAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateEmployeeBik([FromBody] UpdateEmployeeBenefitInKindInput input)
        {
            await _employeeBenefitInKindAppService.Update(input);
            return Json(200);

        }
        public async Task<ActionResult> DelEmployeeBik([FromQuery] Guid id)
        {
            await _employeeBenefitInKindAppService.Delete(id);
            return Json(200);
        }

        //employee loans...

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateEmployeeLoan([FromBody] CreateEmployeeLoanInput input)
        {
            input.IsApproved= false;
            await _employeeLoanAppService.Create(input);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateEmployeeLoan([FromBody] UpdateEmployeeLoanInput input)
        {
            await _employeeLoanAppService.Update(input);
            return Json(200);
        }
        
        

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetPendingLoans()
        {
            var loans = await _employeeLoanAppService.ListPendingLoans();

            var repaymentSchedule = await _employeeLoanRepaymentScheduleAppService.ListAll();

            return Json(new { loans, repaymentSchedule });
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetApprovedLoans()
        {
            var loans = await _employeeLoanAppService.ListApprovedLoans();

            return Json(loans);
        }

        public async Task<ActionResult> ApproveEmployeeLoan([FromBody] LoanApprovalDto approvalDto)
        {
            await _employeeLoanAppService.Approve(approvalDto.Ids, approvalDto.ApprovalType);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> GetLoanDetails(Guid id)
        {
            var result = await _employeeLoanAppService.GetAsync(id);
            return Json(result);
        }

        //salary advance...
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetPendingSalaryAdvance()
        {
            var loans = await _employeeSalaryAdvanceAppService.ListPendingSalaryAdvance();

            return Json(loans);
        }
        
        public async Task<ActionResult> ApproveEmployeeSalaryAdvance([FromBody] SalaryAdvanceApprovalDto approvalDto)
        {
            await _employeeSalaryAdvanceAppService.Approve(approvalDto.Ids, approvalDto.ApprovalType);
            return Json(200);
        }
        
        
        public async Task<ActionResult> CreateEmployeeSalaryAdvance([FromBody] CreateEmployeeSalaryAdvanceInput input)
        {
           
            await _employeeSalaryAdvanceAppService.Create(input);
            return Json(200);
        }
        
        public async Task<ActionResult> UpdateSalaryAdvance([FromBody] UpdateEmployeeSalaryAdvanceInput input)
        {
            await _employeeSalaryAdvanceAppService.Update(input);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> GetSalaryAdvanceDetails(Guid id)
        {
            var result = await _employeeSalaryAdvanceAppService.GetAsync(id);
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateEmployeeSalaryAdvance([FromBody] UpdateEmployeeSalaryAdvanceInput input)
        {
            await _employeeSalaryAdvanceAppService.Update(input);
            return Json(200);
        }

        

        //one time deductions

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetOnetimeDeductions([FromQuery] int month, int year)
        {
            var employees = await _employeeBioDataAppService.ListAll();
            var onetimeDeduction = await _employeeOnetimeDeductionAppService.ListAll(month, year);
            var deductionTypes = await _deductionTypeAppService.ListAll();

            return Json(new { employees, onetimeDeduction, deductionTypes });
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateOnetimeDeduction([FromBody] CreateEmployeeOnetimeDeductionInput input)
        {
            await _employeeOnetimeDeductionAppService.Create(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateBulkOnetimeDeduction([FromBody] BulkOnetimeDeductionInput input)
        {
            foreach (CreateEmployeeOnetimeDeductionInput bonus in input.DeductionList)
            {
                await _employeeOnetimeDeductionAppService.Create(bonus);
            }

            return Json(200);
        }

        public async Task<ActionResult> UpdateOnetimeDeduction([FromBody] UpdateEmployeeOnetimeDeductionInput input)
        {
            await _employeeOnetimeDeductionAppService.Update(input);
            return Json(200);
        }

        public async Task<ActionResult> DelOnetimeDeduction([FromQuery] Guid id)
        {
            await _employeeOnetimeDeductionAppService.Delete(id);
            return Json(200);
        }

        // employee reliefs
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeReliefs([FromQuery] Guid employeeId)
        {
            var employeeReliefs = await _employeeReliefAppService.ListAll(employeeId);
            var taxReliefs = await _taxReliefAppService.ListAll();

            return Json(new { employeeReliefs, taxReliefs });
        }

        public async Task<ActionResult> CreateEmployeeRelief([FromBody] CreateEmployeeReliefInput input)
        {
            var result = await _employeeReliefAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateEmployeeRelief([FromBody] UpdateEmployeeReliefInput input)
        {
            await _employeeReliefAppService.Update(input);
            return Json(200);

        }
        public async Task<ActionResult> DelEmployeeRelief([FromQuery] Guid id)
        {
            await _employeeReliefAppService.Delete(id);
            return Json(200);
        }

        //employee overtime

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeOvertime([FromQuery] int month, int year)
        {
            var overtimeTimeSheet = await _overtimeTimeSheetAppService.ListAll(month, year);
            var employees = await _employeeBioDataAppService.ListAll();
            /*var overtimeTypes = await _taxReliefAppService.ListAll();*/
            var overtimeTypes = await _overtimeTypeAppService.ListAll();

            return Json(new { overtimeTimeSheet, overtimeTypes, employees });
        }

        public async Task<ActionResult> CreateEmployeeOvertime([FromBody] CreateOvertimeTimeSheetInput input)
        {
            await _overtimeTimeSheetAppService.Create(input);
            return Json(200);
        }

        public async Task<ActionResult> UpdateEmployeeOvertime([FromBody] UpdateOvertimeTimeSheetInput input)
        {
            await _overtimeTimeSheetAppService.Update(input);
            return Json(200);

        }
        public async Task<ActionResult> DelEmployeeOvertime([FromQuery] Guid id)
        {
            await _overtimeTimeSheetAppService.Delete(id);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateStatus([FromQuery] Guid employeeId, Guid statusId, string reason)
        {
            await _employeeBioDataAppService.UpdateStatus(employeeId, statusId);

            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> AmortizeLoan([FromBody] LoanAmortizationDto dto)
        {
            await _employeeLoanAppService.AmortizeLoan(dto);
             
            return Json(200);
        }

        

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetLoanRepaymentSummary([FromQuery] Guid loanId)
        {
           var response = await _employeeLoanAppService.GetLoanRepaymentSummary(loanId);

            return Json(response);
        }

    }
}
