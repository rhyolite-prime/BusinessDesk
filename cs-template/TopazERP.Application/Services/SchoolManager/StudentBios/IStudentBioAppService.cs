using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StudentBios.Dto;

namespace TopazERP.Services.SchoolManager.StudentBios;

public interface IStudentBioAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateStudentBioInput input);
    Task<object> Import(CreateStudentBioInput input);
    Task Update(UpdateStudentBioInput input);
    Task Delete(Guid id);
    Task<object> GetById(Guid id);
    Task<string> GenerateStudentIdAsync();
    Task<string> GenerateIndexNoAsync();
    
}