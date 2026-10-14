using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.NurseryGradings.Dto;

namespace TopazERP.Services.SchoolManager.NurseryGradings;

public interface INurseryGradingAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateNurseryGradingInput input);
    Task Update(UpdateNurseryGradingInput input);
    Task Delete(Guid id);
}