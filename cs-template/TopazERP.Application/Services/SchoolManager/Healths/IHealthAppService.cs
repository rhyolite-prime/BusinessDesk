using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.Healths.Dto;

namespace TopazERP.Services.SchoolManager.Healths;

public interface IHealthAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateHealthInput input); 
    Task Update(UpdateHealthInput input);
    Task Delete(Guid id);
    
}