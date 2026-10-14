using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.TimeTables.Dto;

namespace TopazERP.Services.SchoolManager.TimeTables;

public interface ITimeTableAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateTimeTableInput term); 
    Task Update(UpdateTimeTableInput term);
    Task Delete(Guid id);
    
}