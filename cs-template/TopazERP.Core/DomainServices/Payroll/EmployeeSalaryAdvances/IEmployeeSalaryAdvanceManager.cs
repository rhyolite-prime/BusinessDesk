using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeSalaryAdvances
{
   public interface IEmployeeSalaryAdvanceManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task Approve(List<Guid> ids, string approvalType);
        Task<object> ListPendingSalaryAdvance();
        Task<object> GetAsync(Guid id);
        Task<object> ListAll(Guid employeeId);
        Task Create(EmployeeSalaryAdvance input);
        Task Update(EmployeeSalaryAdvance input);
        Task Delete(Guid Id);
    }
}
