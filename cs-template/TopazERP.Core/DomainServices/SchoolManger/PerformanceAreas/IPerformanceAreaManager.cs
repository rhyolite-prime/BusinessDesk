using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.PerformanceAreas;

public interface IPerformanceAreaManager : Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(PerformanceArea performanceArea);
    Task Update(PerformanceArea performanceArea);
    Task Delete(Guid id);
    
    //skill
    Task<IEnumerable<object>> ListAllSkills();
    Task<object> CreateSkill(PerformanceSkill performanceSkill);
    Task UpdateSkill(PerformanceSkill performanceSkill);
    Task DeleteSkill(Guid id);
    
    // student Perfomance skill
    Task<IEnumerable<object>> ListAllStudentPerformanceSkills();
    Task<object> CreateStudentPerformanceSkill(StudentPerformanceSkill studentPerformanceSkill);
    Task UpdateStudentPerformanceSkill(StudentPerformanceSkill studentPerformanceSkill);
    Task DeleteStudentPerformanceSkill(Guid id);
}