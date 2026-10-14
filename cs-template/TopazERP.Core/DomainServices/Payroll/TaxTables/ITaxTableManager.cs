using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.TaxTables
{
   public interface ITaxTableManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task Create(TaxTable input);
        Task Update(TaxTable input);
        Task Delete(Guid Id);
    }
}
