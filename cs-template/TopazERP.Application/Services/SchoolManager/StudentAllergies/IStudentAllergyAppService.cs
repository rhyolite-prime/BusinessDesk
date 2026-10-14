using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StudentAllergies.Dto;

namespace TopazERP.Services.SchoolManager.StudentAllergies;

public interface IStudentAllergyAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateAllergyInput input);
    Task Update(UpdateAllergyInput input);
    Task Delete(Guid id);
    
    // student specific methods
    Task<IEnumerable<object>> ListByStudentId(Guid studentId);
    Task<object> CreateStudentAllergy(CreateStudentAllergyInput input);
    Task UpdateStudentAllergy(UpdateStudentAllergyInput input);
    Task DeleteStudentAllergy(Guid id);
}