using System.Threading.Tasks;
using TopazERP.DomainServices.Ar.Dashboard;
namespace TopazERP.Services.Ar.Dashboard;

public class ArDashboardAppService: TopazERPAppServiceBase, IArDashboardAppService
{
    
        private readonly IArDashboardManager _arDashboardManager;
    
        public ArDashboardAppService(IArDashboardManager arDashboardManager)
        {
            _arDashboardManager = arDashboardManager;
        }

        public async Task<object> GetCustomerDistribution()
        {
            return await _arDashboardManager.GetCustomerDistribution();
        }
    
      public async Task<object> GetCustomerOpeningBalance()
      {
           return await _arDashboardManager.GetCustomerOpeningBalance();
       }
     
        public async Task<object> GetCustomerInvoices()
        {
            return await _arDashboardManager.GetCustomerInvoices();
        }
        
        public async Task<object> GetCustomerPayments()
        {
            return await _arDashboardManager.GetCustomerPayments();
        }
        
        public async Task<object> GetCalculations()
        {
            return await _arDashboardManager.GetCalculations();
        }
        public async Task<object> GetInvoiceAnalysis()
        {
            return await _arDashboardManager.GetInvoiceAnalysis();
        }
}
