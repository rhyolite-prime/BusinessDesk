using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.FeesDescriptions.Dto;

namespace TopazERP.Services.SchoolManager.FeesDescriptions;

public interface IFeesDescriptionAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateFeesDescriptionInput input);
    Task Update(UpdateFeesDescriptionInput input);
    Task Delete(Guid id);
}