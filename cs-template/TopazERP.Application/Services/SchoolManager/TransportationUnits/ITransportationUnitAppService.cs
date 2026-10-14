using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.TransportationUnits.Dto;

namespace TopazERP.Services.SchoolManager.TransportationUnits;

public interface ITransportationUnitAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateTransportationUnitInput input);
    Task Update(UpdateTransportationUnitInput input);
    Task Delete(Guid id);
}