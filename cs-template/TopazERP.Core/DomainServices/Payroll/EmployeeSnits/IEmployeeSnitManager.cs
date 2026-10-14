using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeSnits
{
   public interface IEmployeeSnitManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task Create(EmployeeSnit input);
        Task Update(EmployeeSnit input); 
        Task<object> GetAsync(Guid id);
        Task Delete(Guid Id);
    }
}
