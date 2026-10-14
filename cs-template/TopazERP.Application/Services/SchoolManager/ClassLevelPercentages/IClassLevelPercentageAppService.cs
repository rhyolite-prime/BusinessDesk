using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.ClassLevelPercentages.Dto;

namespace TopazERP.Services.SchoolManager.ClassLevelPercentages;

public interface IClassLevelPercentageAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateClassLevelPercentageInput input);
    Task Update(UpdateClassLevelPercentageInput input);
    Task Delete(Guid id);
    
}