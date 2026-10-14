using TopazERP.Services.Payroll.EmployeeSalaryAdvances.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeSalaryAdvances
{
   public interface IEmployeeSalaryAdvanceAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> ListPendingSalaryAdvance();
        Task<object> GetAsync(Guid id);
        Task Approve(List<Guid> ids, string approvalType);
        Task<object> ListAll(Guid employeeId);
        Task Create(CreateEmployeeSalaryAdvanceInput input);
        Task Update(UpdateEmployeeSalaryAdvanceInput input);
        Task Delete(Guid Id);
    }
}
