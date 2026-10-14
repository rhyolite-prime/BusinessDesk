using System;
using System.Threading.Tasks;
using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;
using TopazERP.DomainServices.Payroll.AllowanceTypes.Dto;
using TopazERP.DomainServices.Payroll.BikTypes.Dto;
using TopazERP.DomainServices.Payroll.DeductionTypes.Dto;
using TopazERP.DomainServices.Payroll.OvertimeTypes.Dto;
using TopazERP.DomainServices.Payroll.PayCalendars.Dto;
using TopazERP.DomainServices.Payroll.SalaryGrades.Dto;
using TopazERP.Services.Ledger.CoaDetails;
using TopazERP.Services.Payroll.AllowanceTypes;
using TopazERP.Services.Payroll.AllowanceTypes.Dto;
using TopazERP.Services.Payroll.BikTypes;
using TopazERP.Services.Payroll.BikTypes.Dto;
using TopazERP.Services.Payroll.DeductionTypes;
using TopazERP.Services.Payroll.DeductionTypes.Dto;
using TopazERP.Services.Payroll.EmployeeCategories;
using TopazERP.Services.Payroll.EmployeeCategories.Dto;
using TopazERP.Services.Payroll.EmployeeRanks;
using TopazERP.Services.Payroll.EmployeeRanks.Dto;
using TopazERP.Services.Payroll.Gratuities;
using TopazERP.Services.Payroll.Gratuities.Dto;
using TopazERP.Services.Payroll.InitializePayMonths;
using TopazERP.Services.Payroll.InitializePayMonths.Dto;
using TopazERP.Services.Payroll.IrsSignatures;
using TopazERP.Services.Payroll.IrsSignatures.Dto;
using TopazERP.Services.Payroll.LoanTypes;
using TopazERP.Services.Payroll.LoanTypes.Dto;
using TopazERP.Services.Payroll.OvertimeTypes;
using TopazERP.Services.Payroll.OvertimeTypes.Dto;
using TopazERP.Services.Payroll.PayCalendars;
using TopazERP.Services.Payroll.PayCalendars.Dto;
using TopazERP.Services.Payroll.SalaryGrades;
using TopazERP.Services.Payroll.SalaryGrades.Dto;
using TopazERP.Services.Payroll.TaxReliefs;
using TopazERP.Services.Payroll.TaxReliefs.Dto;
using TopazERP.Services.Payroll.TaxTableHistories;
using TopazERP.Services.Payroll.TaxTables;
using TopazERP.Services.Payroll.TaxTables.Dto;
using TopazERP.Services.Shared.PersonnelStatus.Dto;
using TopazERP.Services.Shared.PersonnelStatuses;

namespace TopazERP.Web.Controllers;

public class PayrollSetupsController : TopazERPControllerBase
{
    private readonly IAllowanceTypeAppService _allowanceTypeAppService;
    private readonly IEmployeeCategoryAppService _employeeCategoryAppService;
    private readonly ICoaDetailAppService _coaDetailAppService;
    private readonly IBikTypeAppService _bikTypeAppService;
    private readonly IDeductionTypeAppService _deductionTypeAppService;
    private readonly IPersonnelStatusAppService _personnelStatusAppService;
    private readonly IEmployeeRankAppService _employeeRankAppService;
    private readonly ITaxTableAppService _taxTableAppService;
    private readonly IGratuityAppService _gratuityAppService;
    private readonly ILoanTypeAppService _loanTypeAppService;
    private readonly IOvertimeTypeAppService _overtimeTypeAppService;
    private readonly IPayCalendarAppService _payCalendarAppService;
    private readonly ISalaryGradeAppService _salaryGradeAppService;
    private readonly ITaxReliefAppService _taxReliefAppService;
    private readonly IInitializePayMonthAppService _initializePayMonthAppService;
    private readonly IIrsSignatureAppService _irsSignatureAppService;
    private readonly ITaxTableHistoryAppService _taxTableHistoryAppService;

    public PayrollSetupsController(IAllowanceTypeAppService allowanceTypeAppService, IEmployeeCategoryAppService employeeCategoryAppService, ICoaDetailAppService coaDetailAppService, IBikTypeAppService bikTypeAppService, IDeductionTypeAppService deductionTypeAppService, IPersonnelStatusAppService personnelStatusAppService, IEmployeeRankAppService employeeRankAppService, ITaxTableAppService taxTableAppService, IGratuityAppService gratuityAppService, ILoanTypeAppService loanTypeAppService, IOvertimeTypeAppService overtimeTypeAppService, IPayCalendarAppService payCalendarAppService, ISalaryGradeAppService salaryGradeAppService, ITaxReliefAppService taxReliefAppService, IInitializePayMonthAppService initializePayMonthAppService, IIrsSignatureAppService irsSignatureAppService, ITaxTableHistoryAppService taxTableHistoryAppService)
    {
        _allowanceTypeAppService = allowanceTypeAppService;
        _employeeCategoryAppService = employeeCategoryAppService;
        _coaDetailAppService = coaDetailAppService;
        _bikTypeAppService = bikTypeAppService;
        _deductionTypeAppService = deductionTypeAppService;
        _personnelStatusAppService = personnelStatusAppService;
        _employeeRankAppService = employeeRankAppService;
        _taxTableAppService = taxTableAppService;
        _gratuityAppService = gratuityAppService;
        _loanTypeAppService = loanTypeAppService;
        _overtimeTypeAppService = overtimeTypeAppService;
        _payCalendarAppService = payCalendarAppService;
        _salaryGradeAppService = salaryGradeAppService;
        _taxReliefAppService = taxReliefAppService;
        _initializePayMonthAppService = initializePayMonthAppService;
        _irsSignatureAppService = irsSignatureAppService;
        _taxTableHistoryAppService = taxTableHistoryAppService;
    }

    // GET
    public IActionResult AllowanceTypesRates()
    {
        return View();
    }
    
    public IActionResult BikTypesRates()
    {
        return View();
    }
    
    public IActionResult DeductionTypesRates()
    {
        return View();
    }
    
    public IActionResult OvertimeTypesRates()
    {
        return View();
    }
    
    public IActionResult EmployeeCategories()
    {
        return View();
    }
    
    public IActionResult EmployeeStatus()
    {
        return View();
    }
    
    public IActionResult EmployeeRanks()
    {
        return View();
    }
    
    public IActionResult Gratuity()
    {
        return View();
    }
    
    public IActionResult LoanTypes()
    {
        return View();
    }
    
    
    public IActionResult PayCalendar()
    {
        return View();
    }
    
    public IActionResult SalaryGradesNotches()
    {
        return View();
    }
    
    public IActionResult TaxTable()
    {
        return View();
    }
    
    public IActionResult TaxReliefs()
    {
        return View();
    }
    
    public IActionResult InitializePayMonth()
    {
        return View();
    }
    
    public IActionResult IrsSignature()
    {
        return View();
    }
    
    public IActionResult HistoricalTaxTable()
    {
        return View();
    }
    
    public IActionResult Initialize()
    {
        return View();
    }
    
    //api
    
    //allowance types
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetAllowanceTypes()
    {
        var allowanceTypes = await _allowanceTypeAppService.ListAll();
        var accountDetails = await _coaDetailAppService.ListAll();
        var employeeCategories = await _employeeCategoryAppService.ListAll();

        return Json(new { allowanceTypes , accountDetails, employeeCategories  });
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateAllowanceType([FromBody] CreateAllowanceTypeInput input)
    {
        var result = await _allowanceTypeAppService.Create(input);
        return Json(result);
    }

    public async Task<ActionResult> UpdateAllowanceType([FromBody] UpdateAllowanceTypeInput input)
    {
        await _allowanceTypeAppService.Update(input);
        return Json(200);

    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DelAllowanceType([FromQuery] Guid id)
    {
        var result = await _allowanceTypeAppService.Delete(id);
        return Json(new { code = result ? 200 : 400, message = "Allowance type has been referenced in other records."});
    }


    //allowance rates
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateAllowanceRate([FromBody] AllowanceRateInput input)
    {
        var result = await _allowanceTypeAppService.CreateAllowanceRate(input);
        return Json(result);
    }

    public async Task<ActionResult> UpdateAllowanceRate([FromBody] AllowanceRateInput input)
    {
        await _allowanceTypeAppService.UpdateAllowanceRate(input);
        return Json(200);
    }

    public async Task<ActionResult> DelAllowanceRate([FromBody] AllowanceRateInput input)
    {
        await _allowanceTypeAppService.DeleteAllowanceRate(input);
        return Json(200);
    }

    //benefits in kind types
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetBikTypes()
    {
        var bikTypes = await _bikTypeAppService.ListAll();
        var allowanceTypes = await _allowanceTypeAppService.ListAll();
        var accountDetails = await _coaDetailAppService.ListAll();
        var employeeCategories = await _employeeCategoryAppService.ListAll();

        return Json(new { bikTypes, accountDetails, employeeCategories, allowanceTypes });
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateBikType([FromBody] CreateBikTypeInput input)
    {
        var result = await _bikTypeAppService.Create(input);
        return Json(result);

    }

    public async Task<ActionResult> UpdateBikType([FromBody] UpdateBikTypeInput input)
    {
        await _bikTypeAppService.Update(input);
        return Json(200);

    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DelBikType([FromQuery] Guid id)
    {
        var result = await _bikTypeAppService.Delete(id);
        return Json(new { code = result ? 200 : 400, message = "Benefit in kind type has been referenced in other records."});
    }


    //benefits in kind rates.
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateBikRate([FromBody] BikRateInput input)
    {
        var result = await _bikTypeAppService.CreateBikRate(input);
        return Json(result);
    }

    public async Task<ActionResult> UpdateBikRate([FromBody] BikRateInput input)
    {
        await _bikTypeAppService.UpdateBikRate(input);
        return Json(200);
    }

    
    public async Task<ActionResult> DelBikRate([FromBody] BikRateInput input)
    {
        await _bikTypeAppService.DeleteBikRate(input);
        return Json(200);
    }

    //deduction types
    //allowance types
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetDeductionTypes()
    {
        var deductionTypes = await _deductionTypeAppService.ListAll();
        var accountDetails = await _coaDetailAppService.ListAll();
        var employeeCategories = await _employeeCategoryAppService.ListAll();

        return Json(new { deductionTypes, accountDetails, employeeCategories });
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateDeductionType([FromBody] CreateDeductionTypeInput input)
    {
        var result = await _deductionTypeAppService.Create(input);
        return Json(result);
    }

    public async Task<ActionResult> UpdateDeductionType([FromBody] UpdateDeductionTypeInput input)
    {
        await _deductionTypeAppService.Update(input);
        return Json(200);

    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DelDeductionType([FromQuery] Guid id)
    {
        var result = await _deductionTypeAppService.Delete(id);
        return Json(new { code = result ? 200 : 400, message = "Deduction type has been referenced in other records."});
    }


    //benefits in kind rates.
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateDeductionRate([FromBody] DeductionRateInput input)
    {
        var result = await _deductionTypeAppService.CreateDeductionRate(input);
        return Json(result);
    }

    public async Task<ActionResult> UpdateDeductionRate([FromBody] DeductionRateInput input)
    {
        await _deductionTypeAppService.UpdateDeductionRate(input);
        return Json(200);
    }

    public async Task<ActionResult> DelDeductionRate([FromBody] DeductionRateInput input)
    {
        await _deductionTypeAppService.DeleteDeductionRate(input);
        return Json(200);
    }


    //overtime types
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetOvertimeTypes()
    {
        var overtimeTypes = await _overtimeTypeAppService.ListAll();
        var employeeCategories = await _employeeCategoryAppService.ListAll();

        return Json(new { overtimeTypes, employeeCategories });
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateOvertime([FromBody] CreateOvertimeTypeInput input)
    {
        var result = await _overtimeTypeAppService.Create(input);
        return Json(result);

    }

    public async Task<ActionResult> UpdateOvertime([FromBody] UpdateOvertimeTypeInput input)
    {
        await _overtimeTypeAppService.Update(input);
        return Json(200);

    }

    public async Task<ActionResult> DelOvertime([FromQuery] Guid id)
    {
        await _overtimeTypeAppService.Delete(id);
        return Json(200);
    }

    //overtime rates
    //benefits in kind rates.
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateOvertimeRate([FromBody] OvertimeRateInput input)
    {
        var result = await _overtimeTypeAppService.CreateOvertimeRate(input);
        return Json(result);
    }

    public async Task<ActionResult> UpdateOvertimeRate([FromBody] OvertimeRateInput input)
    {
        await _overtimeTypeAppService.UpdateOvertimeRate(input);
        return Json(200);
    }

    public async Task<ActionResult> DelOvertimeRate([FromBody] OvertimeRateInput input)
    {
        await _overtimeTypeAppService.DeleteOvertimeRate(input);
        return Json(200);
    }


    // employee categories
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetEmployeeCategories()
    {
        var results = await _employeeCategoryAppService.ListAll();
        return Json(results);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateEmployeeCategory([FromBody] CreateEmployeeCategoryInput input)
    {
        var result = await _employeeCategoryAppService.Create(input);
        return Json(result);

    }

    public async Task<ActionResult> UpdateEmployeeCategory([FromBody] UpdateEmployeeCategoryInput input)
    {
        await _employeeCategoryAppService.Update(input);
        return Json(200);

    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DelEmployeeCategory([FromQuery] Guid id)
    {
        var result = await _employeeCategoryAppService.Delete(id);
        return Json(new { code = result ? 200 : 400, message = "Employee category has been referenced in other records."});
    }

    // employee status
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetEmployeeStatus()
    {
        var results = await _personnelStatusAppService.ListAll();
        return Json(results);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateEmployeeStatus([FromBody] CreatePersonnelStatusInput input)
    {
        var result = await _personnelStatusAppService.Create(input);
        return Json(result);

    }

    public async Task<ActionResult> UpdateEmployeeStatus([FromBody] UpdatePersonnelStatusInput input)
    {
        await _personnelStatusAppService.Update(input);
        return Json(200);

    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DelEmployeeStatus([FromQuery] Guid id)
    {
        var result = await _personnelStatusAppService.Delete(id);
        return Json(new { code = result ? 200 : 400, message = "Employee status has been referenced in other records."});
    }

    // employee rank
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetEmployeeRanks()
    {
        var results = await _employeeRankAppService.ListAll();
        return Json(results);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateEmployeeRank([FromBody] CreateEmployeeRankInput input)
    {
        var result = await _employeeRankAppService.Create(input);
        return Json(result);

    }

    public async Task<ActionResult> UpdateEmployeeRank([FromBody] UpdateEmployeeRankInput input)
    {
        await _employeeRankAppService.Update(input);
        return Json(200);

    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DelEmployeeRank([FromQuery] Guid id)
    {
        var result = await _employeeRankAppService.Delete(id);
        return Json(new { code = result ? 200 : 400, message = "Employee rank has been referenced in other records."});
    }


    // tax tables
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetTaxTables()
    {
        var results = await _taxTableAppService.ListAll();
        return Json(results);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateTaxTable([FromBody] CreateTaxTableInput input)
    {
        await _taxTableAppService.Create(input);
        return Json(200);
    }

    public async Task<ActionResult> UpdateTaxTable([FromBody] UpdateTaxTableInput input)
    {
        await _taxTableAppService.Update(input);
        return Json(200);
    }

    public async Task<ActionResult> DelTaxTable([FromQuery] Guid id)
    {
        await _taxTableAppService.Delete(id);
        return Json(200);
    }

    // gratuity
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetGratuity()
    {
        var results = await _gratuityAppService.ListAll();
        return Json(results);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateGratuity([FromBody] CreateGratuityInput input)
    {
        await _gratuityAppService.Create(input);
        return Json(200);
    }

    public async Task<ActionResult> UpdateGratuity([FromBody] UpdateGratuityInput input)
    {
        await _gratuityAppService.Update(input);
        return Json(200);
    }

    public async Task<ActionResult> DelGratuity([FromQuery] Guid id)
    {
        await _gratuityAppService.Delete(id);
        return Json(200);
    }

    // loan types
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetLoanTypes()
    {
        var results = await _loanTypeAppService.ListAll();
        return Json(results);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateLoanType([FromBody] CreateLoanTypeInput input)
    {
         var result = await _loanTypeAppService.Create(input);
        return Json(result);
    }

    public async Task<ActionResult> UpdateLoanType([FromBody] UpdateLoanTypeInput input)
    {
        await _loanTypeAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DelLoanType([FromQuery] Guid id)
    {
        var result = await _loanTypeAppService.Delete(id);
        return Json(new { code = result ? 200 : 400, message = "Loan type has been referenced in other records."});
    }


    //pay calender
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetPayCalendars()
    {
        var results = await _payCalendarAppService.ListAll();
        return Json(results);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreatePayCalendar([FromBody] CreatePayCalendarInput input)
    {
        await _payCalendarAppService.Create(input);
        return Json(200);
    }

    public async Task<ActionResult> UpdatePayCalendar([FromBody] UpdatePayCalendarInput input)
    {
        await _payCalendarAppService.Update(input);
        return Json(200);
    }

    public async Task<ActionResult> DelPayCalendar([FromQuery] Guid id)
    {
        await _payCalendarAppService.Delete(id);
        return Json(200);
    }

    //pay calendar details
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreatePayCalendarDetails([FromBody] PayCalendarDetailInput input)
    {
        var result = await _payCalendarAppService.CreatePayCalendarDetails(input);
        return Json(result);
    }

    public async Task<ActionResult> UpdatePayCalendarDetails([FromBody] PayCalendarDetailInput input)
    {
        await _payCalendarAppService.UpdatePayCalendarDetails(input);
        return Json(200);
    }

    public async Task<ActionResult> DelPayCalendarDetails([FromBody] PayCalendarDetailInput input)
    {
        await _payCalendarAppService.DeletePayCalendarDetails(input);
        return Json(200);
    }

    // salary grades
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetSalaryGrades()
    {
        var results = await _salaryGradeAppService.ListAll();
        return Json(results);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateSalaryGrade([FromBody] CreateSalaryGradeInput input)
    {
        var result = await _salaryGradeAppService.Create(input);
        return Json(result);
    }

    public async Task<ActionResult> UpdateSalaryGrade([FromBody] UpdateSalaryGradeInput input)
    {
        await _salaryGradeAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DelSalaryGrade([FromQuery] Guid id)
    {
        var result =  await _salaryGradeAppService.Delete(id);
        return Json(new { code = result ? 200 : 400, message = "Salary grade has been referenced in other records."});
    }

    // salary notch
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateSalaryNotch([FromBody] SalaryNotchInput input)
    {
        var result = await _salaryGradeAppService.CreateSalaryNotch(input);
        return Json(result);
    }

    public async Task<ActionResult> UpdateSalaryNotch([FromBody] SalaryNotchInput input)
    {
        await _salaryGradeAppService.UpdateSalaryNotch(input);
        return Json(200);
    }

    public async Task<ActionResult> DelSalaryNotch([FromBody] SalaryNotchInput input)
    {
        await _salaryGradeAppService.DeleteSalaryNotch(input);
        return Json(200);
    }

    // tax reliefs
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetTaxReliefs()
    {
        var results = await _taxReliefAppService.ListAll();
        return Json(results);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateTaxRelief([FromBody] CreateTaxReliefInput input)
    {
        var result = await _taxReliefAppService.Create(input);
        return Json(result);

    }

    public async Task<ActionResult> UpdateTaxRelief([FromBody] UpdateTaxReliefInput input)
    {
        await _taxReliefAppService.Update(input);
        return Json(200);

    }

    public async Task<ActionResult> DelTaxRelief([FromQuery] Guid id)
    {
        await _taxReliefAppService.Delete(id);
        return Json(200);
    }

    //initialize pay month ...
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetPayMonth()
    {
        var results = await _initializePayMonthAppService.GetData();
        return Json(results);
    }

    public async Task<ActionResult> InitPayMonth([FromBody] CreateInitializePayMonthInput input)
    {
        await _initializePayMonthAppService.Create(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetIrsSignature()
    {
       var results = await _irsSignatureAppService.GetSignature();
       return Json(results);
    }

    public async Task<ActionResult> CreateIrsSignature([FromBody] CreateIrsSignatureInput input)
    {
        await _irsSignatureAppService.Create(input);
        return Json(200);
    }

    //tax table history ...

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetTaxTableHistory()
    {
        var results = await _taxTableHistoryAppService.ListAll();
        return Json(results);
    }
    public async Task<ActionResult> SaveTaxTableHistory([FromQuery] string title)
    {
        await _taxTableHistoryAppService.Create(title);
        return Json(200);
    }

    public async Task<ActionResult> DelTaxTableHistory([FromQuery] Guid id)
    {
        await _taxTableHistoryAppService.Delete(id);
        return Json(200);
    }

    public async Task<ActionResult> RestoreTaxTableHistory([FromQuery] Guid id)
    {
        await _taxTableHistoryAppService.Restore(id);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetDefaultAllowanceDays()
    {
        var result = await _payCalendarAppService.GetDefaultAllowanceDays();
        return Json(result);
    }
}