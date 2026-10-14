using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.Dashboard;

public interface IPayrollDashboardAppService: Abp.Application.Services.IApplicationService
{
    Task<object> GetEmployeeGenderDistribution();
    Task<object> GetEmployeeCategoryDistribution();
    Task<object> GetLoanDistribution();
    Task<object> GetLoanPaymentDistribution();
    
}