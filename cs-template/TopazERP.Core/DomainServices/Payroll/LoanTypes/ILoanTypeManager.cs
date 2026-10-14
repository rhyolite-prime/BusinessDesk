using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.LoanTypes
{
   public interface ILoanTypeManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<LoanType> GetAsync(string name);
        Task<object> Create(LoanType input);
        Task Update(LoanType input);
        Task<bool> Delete(Guid Id);
    }
}
