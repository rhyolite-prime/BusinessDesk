using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;
using System.Threading.Tasks;
using System;
using Abp.Authorization;
using TopazERP.Authorization;
using TopazERP.Services.Payroll.EmployeeSalaryInfos;
using TopazERP.DomainServices.Payroll.EmployeeSalaryInfos.Dto;

namespace TopazERP.Web.Controllers
{
    [AbpAuthorize(PermissionNames.Payroll_SalaryIncrease)]
    public class SalaryIncreaseController : TopazERPControllerBase
    {
        private readonly IEmployeeSalaryInfoAppService _employeeSalaryInfoAppService;

        public SalaryIncreaseController(IEmployeeSalaryInfoAppService employeeSalaryInfoAppService)
        {
            _employeeSalaryInfoAppService = employeeSalaryInfoAppService;
        }

        [AbpAuthorize(PermissionNames.Payroll_SalaryIncrease_AccrossBoard)]
        public IActionResult IncreaseAcrossBoard()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_SalaryIncrease_ByCategory)]
        public IActionResult IncreaseByCategory()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_SalaryIncrease_ByGradeAndNotch)]
        public IActionResult IncreaseByGradeNotch()
        {
            return View();
        }

        // => api...
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeBySalaryType([FromQuery] string salaryType)
        {
            var results = await _employeeSalaryInfoAppService.GetAllBySalaryType(salaryType);

            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeByCategory([FromQuery] string salaryType, Guid categoryId)
        {
            var results = await _employeeSalaryInfoAppService.GetAllBySalaryType(salaryType, categoryId);

            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetEmployeeBySalaryGrade([FromQuery] string salaryType, Guid salaryGradeId, Guid salaryNotchId)
        {
            var results = await _employeeSalaryInfoAppService.GetAllBySalaryGrade(salaryType, salaryGradeId, salaryNotchId);

            return Json(results);
        }

        public async Task<ActionResult> ProcessSalaryIncrement([FromBody] SalaryIncrementDto input)
        {
            await _employeeSalaryInfoAppService.ProcessSalaryIncrement(input.SalaryData);
            return Json(200);

        }
    }
}
