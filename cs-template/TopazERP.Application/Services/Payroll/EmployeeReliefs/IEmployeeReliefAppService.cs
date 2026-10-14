using TopazERP.Services.Payroll.EmployeeReliefs.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeReliefs
{
   public interface IEmployeeReliefAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> ListAll(Guid employeeId);
        Task<object> Create(CreateEmployeeReliefInput input);
        Task Update(UpdateEmployeeReliefInput input);
        Task Delete(Guid Id);
    }
}
