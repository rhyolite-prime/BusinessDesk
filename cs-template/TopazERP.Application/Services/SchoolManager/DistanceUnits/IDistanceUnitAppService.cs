using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.DistanceUnits.Dto;

namespace TopazERP.Services.SchoolManager.DistanceUnits;

public interface IDistanceUnitAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateDistanceUnitInput input); 
    Task Update(UpdateDistanceUnitInput input);
    Task Delete(Guid id);
    
}