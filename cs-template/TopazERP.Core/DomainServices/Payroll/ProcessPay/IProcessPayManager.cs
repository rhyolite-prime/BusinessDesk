using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Actors.MessageModels;

namespace TopazERP.DomainServices.Payroll.ProcessPay
{
    public interface IProcessPayManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ProcessPayroll(Guid id);
        Task PostPayroll();
        Task<object> GetPayrollResults();
        Task<object> Process13thMonth(Guid defaultStatusId, Guid earningTypeId);
        Task<object> GetSpecialEarningsPayrollResults();
        Task<object> GetSpecialEarningsPayrollResults(Guid employeeId);
        Task<object> GetPayrollResults(Guid employeeId);
        Task DispatchPayslips(PayslipDispatchDto dto);
    }
}
