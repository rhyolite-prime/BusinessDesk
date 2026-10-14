using TopazERP.Services.Shared.CostCenters.Dto;
using TopazERP.Services.Shared.Cties.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Cties
{
    public interface ICityAppService : Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateCityInput input);
        Task Update(UpdateCityInput input);
        Task Delete(Guid Id);
    }
}
