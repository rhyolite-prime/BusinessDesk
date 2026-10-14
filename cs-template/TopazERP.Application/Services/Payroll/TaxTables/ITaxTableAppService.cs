using TopazERP.Services.Payroll.TaxTables.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.TaxTables
{
   public interface ITaxTableAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task Create(CreateTaxTableInput input);
        Task Update(UpdateTaxTableInput input);
        Task Delete(Guid Id);
    }
}
