using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.PerformanceAreas.Dto;

namespace TopazERP.Services.SchoolManager.PerformanceAreas;

public interface IPerformanceAreaAppService : Abp.Application.Services.IApplicationService
{
    // Areas
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreatePerformanceAreaInput input);
    Task Update(UpdatePerformanceAreaInput input);
    Task Delete(Guid id);

    // Skills
    Task<IEnumerable<object>> ListAllSkills();
    Task<object> CreateSkill(CreatePerformanceSkillInput input);
    Task UpdateSkill(UpdatePerformanceSkillInput input);
    Task DeleteSkill(Guid id);
    
    // student Perfomance skill
    Task<IEnumerable<object>> ListAllStudentPerformanceSkills();
    Task<object> CreateStudentPerformanceSkill(CreateStudentPerformanceSkill input);
    Task UpdateStudentPerformanceSkill(UpdateStudentPerfomanceSkill input);
    Task DeleteStudentPerformanceSkill(Guid id);
}