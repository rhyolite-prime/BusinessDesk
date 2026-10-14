using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StudentImmunizations.Dto;

namespace TopazERP.Services.SchoolManager.StudentImmunizations;

public interface IStudentImmunizationAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateImmunizationInput input);
    Task Update(UpdateImmunizationInput input);
    Task Delete(Guid id);
    
    // student specific immunizations
    Task<IEnumerable<object>> ListAllForStudent(Guid studentId);
    Task<object> CreateForStudent(CreateStudentImmunizationInput input);
    Task UpdateForStudent(UpdateStudentImmunizationInput input);
    Task DeleteForStudent(Guid id);
    
}