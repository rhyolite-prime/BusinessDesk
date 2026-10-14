using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.LevelsAndCLasses;

public interface ILevelAndClassManager: Abp.Domain.Services.IDomainService
{
    //levels
    Task<IEnumerable<object>> ListAllLevels();
    Task<object> CreateLevel(Level input);
    Task UpdateLevel(Level input);
    Task DeleteLevel(Guid id);
    
    // level classes
    Task<IEnumerable<object>> ListAllLevelClasses();
    Task<object> CreateLevelClass(LevelClass input);
    Task UpdateLevelClass(LevelClass input);
    Task DeleteLevelClass(Guid id);
    
}