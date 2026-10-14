using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.TaxTableHistories
{
    public interface ITaxTableHistoryAppService : Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task Create(string title);
        Task Delete(Guid Id);

        Task Restore(Guid Id);
    }
}
