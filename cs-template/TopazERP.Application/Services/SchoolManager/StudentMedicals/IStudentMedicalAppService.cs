using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StudentMedicals.Dto;

namespace TopazERP.Services.SchoolManager.StudentMedicals;

public interface IStudentMedicalAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListByStudentId(Guid studentId);
    Task<object> Create(CreateStudentMedicalInput input);
    Task Update(UpdateStudentMedicalInput input);
    Task Delete(Guid id);
    
}