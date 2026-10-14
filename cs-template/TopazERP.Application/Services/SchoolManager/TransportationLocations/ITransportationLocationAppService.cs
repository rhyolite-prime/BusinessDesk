using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.TransportationLocations.Dto;

namespace TopazERP.Services.SchoolManager.TransportationLocations;

public interface ITransportationLocationAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateTransportationLocationInput input);
    Task Update(UpdateTransportationLocationInput input);
    Task Delete(Guid id);
}