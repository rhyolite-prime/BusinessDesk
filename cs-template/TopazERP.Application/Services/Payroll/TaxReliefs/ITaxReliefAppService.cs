using TopazERP.Services.Payroll.TaxReliefs.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.TaxReliefs
{
   public interface ITaxReliefAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateTaxReliefInput input);
        Task Update(UpdateTaxReliefInput input);
        Task Delete(Guid Id);
    }
}
