using TopazERP.Services.Payroll.EmployeeOnetimeDeductions.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeOnetimeDeductions
{
   public interface IEmployeeOnetimeDeductionAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> ListAll(Guid employeeId);
        Task<object> ListAll(int month, int year);
        Task Create(CreateEmployeeOnetimeDeductionInput input);
        Task Update(UpdateEmployeeOnetimeDeductionInput input);
        Task Delete(Guid Id);
    }
}
