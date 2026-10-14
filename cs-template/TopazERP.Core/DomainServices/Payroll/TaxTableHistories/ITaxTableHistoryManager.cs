using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.TaxTableHistories
{
    public interface ITaxTableHistoryManager: Abp.Domain.Services.IDomainService
    {
        Task Create(string title);
        Task<object> ListAll();
        Task Delete(Guid Id);
        Task Restore(Guid Id);
    }
}
