using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.SalaryIncrements
{
   public interface ISalaryIncrementHistoryManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task Create(Models.Payroll.SalaryIncrementHistory input);
    }
}
