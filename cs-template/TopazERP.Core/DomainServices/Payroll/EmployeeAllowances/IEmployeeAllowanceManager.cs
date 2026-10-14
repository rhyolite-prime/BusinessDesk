using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeAllowances
{
   public interface IEmployeeAllowanceManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListAll(Guid employeeId);
        Task<object> Create(EmployeeAllowance input);
        Task Update(EmployeeAllowance input);
        Task Delete(Guid Id);
    }
}
