using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.ParentProfessions.Dto;

namespace TopazERP.Services.SchoolManager.ParentProfessions;

public interface IParentProfessionAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateParentProfessionInput input);
    Task Update(UpdateParentProfessionInput input);
    Task Delete(Guid id);
}