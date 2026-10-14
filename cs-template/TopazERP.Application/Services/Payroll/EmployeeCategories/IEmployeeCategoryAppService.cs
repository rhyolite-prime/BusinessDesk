using TopazERP.Services.Payroll.EmployeeCategories.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeCategories
{
   public interface IEmployeeCategoryAppService : Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateEmployeeCategoryInput input);
        Task Update(UpdateEmployeeCategoryInput input);
        Task<bool> Delete(Guid Id);
    }
}
