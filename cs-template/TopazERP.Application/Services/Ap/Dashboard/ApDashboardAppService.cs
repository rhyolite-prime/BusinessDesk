using System.Threading.Tasks;
using TopazERP.DomainServices.Ap.Dashboard;

namespace TopazERP.Services.Ap.Dashboard;

public class ApDashboardAppService: TopazERPAppServiceBase, IApDashboardAppService
{
    
        private readonly IApDashboardManager _apDashboardManager;
    
        public ApDashboardAppService(IApDashboardManager apDashboardManager)
        {
            _apDashboardManager = apDashboardManager;
        }

        public async Task<object> GetSupplierResidentDistribution()
        {
            return await _apDashboardManager.GetSupplierResidentDistribution();
        }
    
      public async Task<object> GetSupplierOpeningBalance()
      {
           return await _apDashboardManager.GetSupplierOpeningBalance();
       }
      
        public async Task<object> GetSupplierInvoices()
        {
            return await _apDashboardManager.GetSupplierInvoices();
        }
        
        public async Task<object> GetSupplierPayments()
        {
            return await _apDashboardManager.GetSupplierPayments();
        }
        
        public async Task<object> GetCalculations()
        {
            return await _apDashboardManager.GetCalculations();
        }
        
        public async Task<object> GetInvoiceAnalysis()
        {
            return await _apDashboardManager.GetInvoiceAnalysis();
        }
}