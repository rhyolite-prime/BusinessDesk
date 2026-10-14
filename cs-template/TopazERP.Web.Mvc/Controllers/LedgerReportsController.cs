using System;
using System.Threading.Tasks;
using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.DomainServices.Ledger.Reports.Dto;
using TopazERP.Services.Ledger.Reports;

namespace TopazERP.Web.Controllers;

[Abp.AspNetCore.Mvc.Authorization.AbpMvcAuthorize]
public class LedgerReportsController : TopazERP.Controllers.TopazERPControllerBase
{
    private readonly IGlReportAppService  _glReportAppService;

    public LedgerReportsController(IGlReportAppService glReportAppService)
    {
        _glReportAppService = glReportAppService;
    }
    
    
    public IActionResult TrialBalance()
    {
        return View();
    }
    
    public IActionResult BalanceSheet()
    {
        return View();
    }
     
    
    public IActionResult GlTransactionsReports()
    {
        return View();
    }
    
    public IActionResult IncomeExpenditure()
    {
        return View();
    }
    
    
    //api
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetGlTransactionReports([FromBody] GlTransactionReportDto dto)
    {
        DateTime finalEndDate = dto.EndDate ?? DateTime.UtcNow;
        DateTime startEndDate = dto.StartDate ?? DateTime.UtcNow;
        
        var reportDetails = await _glReportAppService.GenerateGlTransactionReports(dto);
        
        var reportHeader = await _glReportAppService.GetReportHeader($"GL Transactions Report for the Period : {startEndDate:dd-MMM-yyyy} to {finalEndDate:dd-MMM-yyyy}");

        return Json(new { reportHeader, reportDetails });
    }
    
    
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetBalanceSheet([FromBody] BalanceSheetDto dto)
    {
        DateTime finalEndDate = dto.EndDate ?? DateTime.Today;

        var reportHeader = await _glReportAppService.GetReportHeader($"Balance Sheet : {finalEndDate:dd-MMM-yyyy}");

        var reportDetails = await _glReportAppService.GetBalancedSheet(dto);

        return Json(new { reportHeader, reportDetails });
    }
    
    
    
}