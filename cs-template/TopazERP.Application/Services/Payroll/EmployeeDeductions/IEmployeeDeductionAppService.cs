using TopazERP.Services.Payroll.EmployeeDeductions.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeDeductions
{
   public interface IEmployeeDeductionAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> ListAll(Guid employeeId);
        Task<object> Create(CreateEmployeeDeductionInput input);
        Task Import(List<ImportEmployeeDeductionInput> inputList);
        Task Update(UpdateEmployeeDeductionInput input);
        Task Delete(Guid Id);
    }
}
