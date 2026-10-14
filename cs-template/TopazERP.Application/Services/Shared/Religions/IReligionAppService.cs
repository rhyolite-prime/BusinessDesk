using Abp.Application.Services;
using TopazERP.Services.Shared.Religions.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Religions
{
   public interface IReligionAppService: IApplicationService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(CreateReligionInput input);
        Task Update(UpdateReligionInput input);
        Task Delete(Guid Id);
    }
}
