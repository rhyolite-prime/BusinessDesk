using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.MonthlySsnitDeductionHistory
{
    public interface IMonthlySsnitDeductionHistManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll(int month, int year);
    }
}
