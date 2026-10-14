using System;
using System.Threading.Tasks;
using TopazERP.DomainServices.Ledger.Reports.Dto;

namespace TopazERP.DomainServices.Ledger.Reports
{
   public interface IReportManager : Abp.Domain.Services.IDomainService
   {
       Task<object> GetReportHeader(string title);
       Task<object> GenerateGlTransactionReports(GlTransactionReportDto dto);
       Task<object> GetDeletedTransactions();
       
       Task<object> GetBalancedSheet(BalanceSheetDto dto);
   }
}
