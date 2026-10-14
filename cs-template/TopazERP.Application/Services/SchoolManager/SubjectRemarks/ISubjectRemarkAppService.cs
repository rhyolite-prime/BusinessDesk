using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.SubjectRemarks.Dto;

namespace TopazERP.Services.SchoolManager.SubjectRemarks;

public interface ISubjectRemarkAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateSubjectRemarkInput input);
    Task Update(UpdateSubjectRemarkInput input);
    Task Delete(Guid id);
}