using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;
using TopazERP.Services.Payroll.ProcessPay;
using System;
using System.IO;
using System.Threading.Tasks;
using Abp.Authorization;
 
using TopazERP.Actors.MessageModels;
using TopazERP.Authorization;

namespace TopazERP.Web.Controllers
{
    [Abp.AspNetCore.Mvc.Authorization.AbpMvcAuthorize]
    public class ProcessPayController : TopazERPControllerBase 
    {
        private readonly IProcessPayAppService _processPayAppService;

        public ProcessPayController(IProcessPayAppService processPayAppService)
        {
            _processPayAppService = processPayAppService;
        }

        [AbpAuthorize(PermissionNames.Payroll_ProcessPay)] 
        public IActionResult Index()
        {
            return View();
        }
        
        [AbpAuthorize(PermissionNames.Payroll_ProcessSpecialEarnings)] 
        public IActionResult SpecialEarnings()
        {
            return View();
        }
        
        

        [AbpAuthorize(PermissionNames.Payroll_PostPay)]
        public IActionResult PostPayroll()
        {
            return View();
        }
        
        //[AbpAuthorize(PermissionNames.Payroll_PostPay)]
        public IActionResult EmailPayslips()
        {
            return View();
        }
        
        public IActionResult PayslipEmailTemplate()
        {
            return View();
        }


        //api
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitPay([FromQuery] Guid id)
        {
            var results = await _processPayAppService.ProcessPayroll(id);
            return Json(results);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitPostPayroll()
        {
            await _processPayAppService.PostPayroll();
            
            return Json(new { code = 200, message = "Payroll posted successfully !" });
        }
        
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitSpecialEarningPay([FromQuery] Guid defaultStatusId, Guid earningTypeId)
        {
            var results = await _processPayAppService.Process13thMonth(defaultStatusId, earningTypeId);
            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetPayrollResults()
        {
            var results = await _processPayAppService.GetPayrollResults();
            return Json(results);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetSpecialEarningsPayrollResults()
        {
            var results = await _processPayAppService.GetSpecialEarningsPayrollResults();
            return Json(results);
        }
        

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> InitializePayslipDispatcher([FromBody] PayslipDispatchDto dto)
        {
            await _processPayAppService.DispatchPayslips(dto);
            return Json(200);
        }
        
         
         
    }
}
