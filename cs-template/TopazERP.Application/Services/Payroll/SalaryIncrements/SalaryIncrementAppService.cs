using TopazERP.DomainServices.Payroll.SalaryIncrements;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.SalaryIncrements
{
    public class SalaryIncrementAppService: TopazERPAppServiceBase, ISalaryIncrementAppService
    {
        private readonly ISalaryIncrementHistoryManager _salaryIncrementHistoryManager;

        public SalaryIncrementAppService(ISalaryIncrementHistoryManager salaryIncrementHistoryManager)
        {
            _salaryIncrementHistoryManager = salaryIncrementHistoryManager;
        }

        public async Task<object> ListAll()
        {
            return await _salaryIncrementHistoryManager.ListAll();
        }
    }
}
