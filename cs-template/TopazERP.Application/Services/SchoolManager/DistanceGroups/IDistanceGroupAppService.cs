using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.DistanceGroups.Dto;

namespace TopazERP.Services.SchoolManager.DistanceGroups;

public interface IDistanceGroupAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateDistanceGroupInput input);
    Task Update(UpdateDistanceGroupInput input);
    Task Delete(Guid id);
}