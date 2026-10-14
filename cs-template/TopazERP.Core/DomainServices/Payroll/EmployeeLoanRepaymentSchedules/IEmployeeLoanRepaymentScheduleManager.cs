using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeLoanRepaymentSchedules
{
   public interface IEmployeeLoanRepaymentScheduleManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
    }
}
