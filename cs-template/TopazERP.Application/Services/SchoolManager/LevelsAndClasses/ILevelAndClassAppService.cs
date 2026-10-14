using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.LevelsAndClasses.Dto;

namespace TopazERP.Services.SchoolManager.LevelsAndClasses;

/// <summary>
/// 
/// </summary>
public interface ILevelAndClassAppService: Abp.Application.Services.IApplicationService
{
    //levels
    Task<IEnumerable<object>> ListAllLevels();
    Task<object> CreateLevel(CreateLevelInput input);
    Task UpdateLevel(UpdateLevelInput input);
    Task DeleteLevel(Guid id);
    
    // level classes
    Task<IEnumerable<object>> ListAllLevelClasses();
    Task<object> CreateLevelClass(CreateLevelClassInput input);
    Task UpdateLevelClass(UpdateLevelClassInput input);
    Task DeleteLevelClass(Guid id);
    
}