using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.PtaExecutives.Dto;

namespace TopazERP.Services.SchoolManager.PtaExecutives;

public interface IPtaExecutiveAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreatePtaExecutiveInput input);
    Task Update(UpdatePtaExecutiveInput input);
    Task Delete(Guid id);
    
}