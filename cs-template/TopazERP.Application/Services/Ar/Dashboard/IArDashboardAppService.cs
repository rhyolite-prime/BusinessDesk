using System.Threading.Tasks;
namespace TopazERP.Services.Ar.Dashboard;

public interface IArDashboardAppService: Abp.Application.Services.IApplicationService
{
    Task<object> GetCustomerDistribution();
    Task<object> GetCustomerOpeningBalance();
  
    Task<object> GetCustomerInvoices();
    
    Task<object> GetCustomerPayments();
    
    Task<object> GetCalculations();
    Task<object> GetInvoiceAnalysis();
    
}