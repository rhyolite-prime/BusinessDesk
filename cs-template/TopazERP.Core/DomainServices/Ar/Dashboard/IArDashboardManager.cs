using System.Collections.Generic;
using System.Threading.Tasks;
namespace TopazERP.DomainServices.Ar.Dashboard;

public interface IArDashboardManager: Abp.Domain.Services.IDomainService
{
    Task<Dictionary<string, object>> GetCustomerDistribution();
    //get supplier opening balance
    Task<Dictionary<string, object>> GetCustomerOpeningBalance();
  
    Task<Dictionary<string, object>> GetCustomerInvoices();
    
    Task<Dictionary<string, object>> GetCustomerPayments();
    
    Task<Dictionary<string, object>> GetCalculations();
    
    Task<Dictionary<string, object>> GetInvoiceAnalysis();

}