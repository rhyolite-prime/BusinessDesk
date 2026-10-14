using System.Threading.Tasks;
using TopazERP.DomainServices.Payroll.Dashboard;

namespace TopazERP.Services.Payroll.Dashboard;

public class PayrollDashboardAppService: TopazERPAppServiceBase, IPayrollDashboardAppService
{

    private readonly IPayrollDashboardManager _payrollDashboardManager;

    public PayrollDashboardAppService(IPayrollDashboardManager payrollDashboardManager)
    {
        _payrollDashboardManager = payrollDashboardManager;
    }


    public async Task<object> GetEmployeeGenderDistribution()
    {
        return await _payrollDashboardManager.GetEmployeeGenderDistribution();
    }

    public async Task<object> GetEmployeeCategoryDistribution()
    {
        return await _payrollDashboardManager.GetEmployeeCategoryDistribution();
    }

    public async Task<object> GetLoanDistribution()
    {
        return await _payrollDashboardManager.GetLoanDistribution();
    }

    public async Task<object> GetLoanPaymentDistribution()
    {
        return await _payrollDashboardManager.GetLoanPaymentDistribution();
    }
}