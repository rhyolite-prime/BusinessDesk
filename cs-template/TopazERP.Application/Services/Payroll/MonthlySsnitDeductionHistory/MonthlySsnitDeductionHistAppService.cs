using TopazERP.DomainServices.Payroll.MonthlySsnitDeductionHistory;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.MonthlySsnitDeductionHistory
{
    public class MonthlySsnitDeductionHistAppService: TopazERPAppServiceBase, IMonthlySsnitDeductionHistAppService
    {
        private readonly IMonthlySsnitDeductionHistManager _monthlySsnitDeductionHistManager;

        public MonthlySsnitDeductionHistAppService(IMonthlySsnitDeductionHistManager monthlySsnitDeductionHistManager)
        {
            _monthlySsnitDeductionHistManager = monthlySsnitDeductionHistManager;
        }

        public async Task<object> ListAll(int month, int year)
        {
            return await _monthlySsnitDeductionHistManager.ListAll(month, year);
        }
    }
}
