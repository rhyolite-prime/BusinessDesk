using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeCategories
{
   public interface IEmployeeCategoryManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> Create(EmployeeCategory input);
        Task<EmployeeCategory> GetAsync(string name);
        Task Update(EmployeeCategory input);
        Task<bool> Delete(Guid Id);
    }
}
