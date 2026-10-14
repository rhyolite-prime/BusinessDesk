using System.Threading.Tasks;

namespace TopazERP.Services.Ap.Dashboard;

public interface IApDashboardAppService : Abp.Application.Services.IApplicationService
{
    Task<object> GetSupplierResidentDistribution();
    Task<object> GetSupplierOpeningBalance();
    
    Task<object> GetSupplierInvoices();
    
    Task<object> GetSupplierPayments();
    
    Task<object> GetCalculations();
    
    Task<object> GetInvoiceAnalysis();
}