using TopazERP.Services.Payroll.EmployeeAllowances.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeAllowances
{
   public interface IEmployeeAllowanceAppService : Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> ListAll(Guid employeeId);
        Task<object> Create(CreateEmployeeAllowanceInput input);
        Task Import(List<ImportEmployeeAllowanceInput> inputList);
        Task Update(UpdateEmployeeAllowanceInput input);
        Task Delete(Guid Id);
    }
}
