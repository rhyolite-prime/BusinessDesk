using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.Locations.Dto;

namespace TopazERP.Services.SchoolManager.Locations;

public interface ILocationAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateLocationInput input);
    Task Update(UpdateLocationInput input);
    Task Delete(Guid id);
}