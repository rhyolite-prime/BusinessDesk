using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.Subjects.Dto;

namespace TopazERP.Services.SchoolManager.Subjects;

public interface ISubjectAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateSubjectInput input);
    Task Update(UpdateSubjectInput input);
    Task Delete(Guid id);
}