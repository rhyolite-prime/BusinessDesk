using System;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.DomainServices.Ledger.Reports.Dto;

namespace TopazERP.Services.Ledger.Reports;

public interface IGlReportAppService: IApplicationService
{
    Task<object> GetReportHeader(string title);
    Task<object> GenerateGlTransactionReports(GlTransactionReportDto dto);
    Task<object> GetDeletedTransactions();
    Task<object> GetBalancedSheet(BalanceSheetDto dto);
}