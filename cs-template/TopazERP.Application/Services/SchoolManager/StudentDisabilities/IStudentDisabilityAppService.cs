using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StudentDisabilities.Dto;

namespace TopazERP.Services.SchoolManager.StudentDisabilities;

public interface IStudentDisabilityAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateDisabilityInput input);
    Task Update(UpdateDisabilityInput input);
    Task Delete(Guid id);
    
    // student-specific methods
    Task<IEnumerable<object>> ListByStudentId(Guid studentId);
    Task<object> CreateForStudent(CreateStudentDisabilityInput input);
    Task UpdateForStudent(UpdateStudentDisabilityInput input);
    Task DeleteForStudent(Guid id);
}