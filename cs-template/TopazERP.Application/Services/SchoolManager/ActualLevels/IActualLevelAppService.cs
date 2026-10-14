using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.ActualLevels.Dto;

namespace TopazERP.Services.SchoolManager.ActualLevels;

public interface IActualLevelAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateActualLevelInput input); 
    Task Update(UpdateActualLevelInput input);
    Task Delete(Guid id);
    
}