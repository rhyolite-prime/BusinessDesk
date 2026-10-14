using System.Collections.Generic;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Ap.Dashboard;

public interface IApDashboardManager: Abp.Domain.Services.IDomainService
{
   Task<Dictionary<string, object>> GetSupplierResidentDistribution();
   //get supplier opening balance
  Task<Dictionary<string, object>> GetSupplierOpeningBalance();
  
  Task<Dictionary<string, object>> GetSupplierInvoices();
  
  Task<Dictionary<string, object>> GetSupplierPayments();
  
  Task<Dictionary<string, object>> GetCalculations();
  // invoice Analysis
  Task<Dictionary<string, object>> GetInvoiceAnalysis();
}
