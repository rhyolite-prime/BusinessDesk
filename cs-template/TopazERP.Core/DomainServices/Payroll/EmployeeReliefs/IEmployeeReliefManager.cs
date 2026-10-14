using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeReliefs
{
   public interface IEmployeeReliefManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListAll(Guid employeeId);
        Task<object> Create(EmployeeRelief input);
        Task Update(EmployeeRelief input);
        Task Delete(Guid Id);
    }
}
