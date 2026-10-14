using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Services.Shared.Countries.Dto;
using TopazERP.Services.Shared.Cties.Dto;

namespace TopazERP.Services.Shared.Countries
{
    public interface ICountryAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateCountryInput input);
        Task Update(UpdateCountryInput input);
        Task Delete(Guid Id);

    }
}
