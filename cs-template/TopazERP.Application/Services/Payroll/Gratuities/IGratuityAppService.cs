using TopazERP.Services.Payroll.DeductionTypes.Dto;
using TopazERP.Services.Payroll.Gratuities.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.Gratuities
{
    public interface IGratuityAppService : Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task Create(CreateGratuityInput input);
        Task Update(UpdateGratuityInput input);
        Task Delete(Guid Id);
    }
}
