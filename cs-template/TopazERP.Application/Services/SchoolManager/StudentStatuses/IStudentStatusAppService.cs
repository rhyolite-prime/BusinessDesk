using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StudentStatuses.Dto;

namespace TopazERP.Services.SchoolManager.StudentStatuses;

public interface IStudentStatusAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateStudentStatusInput input);
    Task Update(UpdateStudentStatusInput input);
    Task Delete(Guid id);
    
}