using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.AssignSubjects.Dto;

namespace TopazERP.Services.SchoolManager.AssignSubjects;

public interface IAssignSubjectAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateAssignSubjectInput input);
    Task Update(UpdateAssignSubjectInput input);
    Task Delete(Guid id);
}