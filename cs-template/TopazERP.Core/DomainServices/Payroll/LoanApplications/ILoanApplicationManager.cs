using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.LoanApplications
{
   public interface ILoanApplicationManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task Create(LoanApplication input);
        Task Delete(Guid Id);
    }
}
