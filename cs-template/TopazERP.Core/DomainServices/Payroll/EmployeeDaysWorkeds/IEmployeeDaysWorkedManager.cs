using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeDaysWorkeds
{
   public interface IEmployeeDaysWorkedManager :Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListAll(int month, int year, string salaryType);
        Task Create(EmployeeDaysWorked input);
        Task Update(EmployeeDaysWorked input);
        Task Delete(Guid Id);
    }
}
