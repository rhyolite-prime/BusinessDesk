using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeBenefitInKinds
{
   public interface IEmployeeBenefitInKindManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListAll(Guid employeeId);
        Task<object> Create(EmployeeBenefitInKind input);
        Task Update(EmployeeBenefitInKind input);
        Task Delete(Guid Id);
    }
}
