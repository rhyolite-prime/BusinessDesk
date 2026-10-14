using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.Excursions.Dto;

namespace TopazERP.Services.SchoolManager.Excursions;

public interface IExcursionAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateExcursionInput input);
    Task Update(UpdateExcursionInput input);
    Task Delete(Guid id);
    
}