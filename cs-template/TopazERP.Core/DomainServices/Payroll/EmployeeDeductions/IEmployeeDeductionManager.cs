using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeDeductions
{
   public interface IEmployeeDeductionManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListAll(Guid employeeId);
        Task<object> Create(EmployeeDeduction input);
        Task Update(EmployeeDeduction input);
        Task Delete(Guid Id);
    }
}
