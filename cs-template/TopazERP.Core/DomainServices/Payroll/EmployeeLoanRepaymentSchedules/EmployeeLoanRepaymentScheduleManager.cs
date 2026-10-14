using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeLoanRepaymentSchedules
{
   public class EmployeeLoanRepaymentScheduleManager: Abp.Domain.Services.DomainService, IEmployeeLoanRepaymentScheduleManager
    {
        private readonly IRepository<EmployeeLoanRepaymentSchedule, Guid> _repositoryEmployeeLoanRepaymentSchedule;

        public EmployeeLoanRepaymentScheduleManager(IRepository<EmployeeLoanRepaymentSchedule, Guid> repositoryEmployeeLoanRepaymentSchedule)
        {
            _repositoryEmployeeLoanRepaymentSchedule = repositoryEmployeeLoanRepaymentSchedule;
        }

        public async Task<object> ListAll()
        {
            return await _repositoryEmployeeLoanRepaymentSchedule.GetAllListAsync();
        }
    }
}
