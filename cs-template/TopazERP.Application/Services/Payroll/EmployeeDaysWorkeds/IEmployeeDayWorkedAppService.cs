using TopazERP.Services.Payroll.EmployeeDaysWorkeds.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeDaysWorkeds
{
   public interface IEmployeeDayWorkedAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> ListAll(int month, int year, string salaryType);
        Task Create(CreateEmployeeDaysWorkedInput input);
        Task Update(UpdateEmployeeDaysWorkedInput input);
        Task Delete(Guid Id);
    }
}
