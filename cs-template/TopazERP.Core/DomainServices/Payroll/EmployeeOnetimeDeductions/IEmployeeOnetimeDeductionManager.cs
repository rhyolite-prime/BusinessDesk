using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeOnetimeDeductions
{
   public interface IEmployeeOnetimeDeductionManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListAll(Guid employeeId);
        Task<object> ListAll(int month, int year);
        Task Create(EmployeeOnetimeDeduction input);
        Task Update(EmployeeOnetimeDeduction input);
        Task Delete(Guid Id);
    }
}
