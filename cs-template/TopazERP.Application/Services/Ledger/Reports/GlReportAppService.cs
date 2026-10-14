using System;
using System.Threading.Tasks;
using TopazERP.DomainServices.Ledger.Reports;
using TopazERP.DomainServices.Ledger.Reports.Dto;

namespace TopazERP.Services.Ledger.Reports;

public class GlReportAppService: IGlReportAppService
{
    private readonly IReportManager  _reportManager;

    public GlReportAppService(IReportManager reportManager)
    {
        _reportManager = reportManager;
    }

    public async Task<object> GetReportHeader(string title)
    {
        return await _reportManager.GetReportHeader(title);
    }


    
    public async Task<object> GenerateGlTransactionReports(GlTransactionReportDto dto)
    {
        return await _reportManager.GenerateGlTransactionReports(dto);
    }


    public async Task<object> GetDeletedTransactions()
    {
        return await _reportManager.GetDeletedTransactions();
    }

    public async Task<object> GetBalancedSheet(BalanceSheetDto dto)
    {
        return await _reportManager.GetBalancedSheet(dto);
    }
}