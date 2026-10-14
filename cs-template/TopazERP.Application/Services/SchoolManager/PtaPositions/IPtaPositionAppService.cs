using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.PtaPositions.Dto;

namespace TopazERP.Services.SchoolManager.PtaPositions;

public interface IPtaPositionAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreatePtaPositionInput input);
    Task Update(UpdatePtaPositionInput input);
    Task Delete(Guid id);
}