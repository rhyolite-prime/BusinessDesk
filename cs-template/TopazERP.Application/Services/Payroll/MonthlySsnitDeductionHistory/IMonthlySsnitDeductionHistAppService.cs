using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.MonthlySsnitDeductionHistory
{
    public interface IMonthlySsnitDeductionHistAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll(int month, int year);
    }
}
