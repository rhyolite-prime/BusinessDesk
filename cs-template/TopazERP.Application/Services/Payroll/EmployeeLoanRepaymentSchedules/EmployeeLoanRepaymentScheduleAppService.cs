using TopazERP.DomainServices.Payroll.EmployeeLoanRepaymentSchedules;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeLoanRepaymentSchedules
{
    public class EmployeeLoanRepaymentScheduleAppService: TopazERPAppServiceBase, IEmployeeLoanRepaymentScheduleAppService
    {
        private readonly IEmployeeLoanRepaymentScheduleManager _employeeLoanRepaymentScheduleManager;

        public EmployeeLoanRepaymentScheduleAppService(IEmployeeLoanRepaymentScheduleManager employeeLoanRepaymentScheduleManager)
        {
            _employeeLoanRepaymentScheduleManager = employeeLoanRepaymentScheduleManager;
        }

        public async Task<object> ListAll()
        {
            return await _employeeLoanRepaymentScheduleManager.ListAll();
        }
    }
}
