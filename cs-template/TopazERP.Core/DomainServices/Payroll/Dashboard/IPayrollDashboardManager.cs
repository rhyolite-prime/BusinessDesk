using System.Collections.Generic;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.Dashboard;

public interface IPayrollDashboardManager: Abp.Domain.Services.IDomainService
{
    Task<Dictionary<string, object>> GetEmployeeGenderDistribution();
    Task<object> GetEmployeeCategoryDistribution();
    Task<object> GetLoanDistribution();
    Task<object> GetLoanPaymentDistribution();
}