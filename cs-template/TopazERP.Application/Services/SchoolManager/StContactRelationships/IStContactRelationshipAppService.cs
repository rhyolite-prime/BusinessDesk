using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StContactRelationships.Dto;

namespace TopazERP.Services.SchoolManager.StContactRelationships;

public interface IStContactRelationshipAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateStContactRelationshipInput input);
    Task Update(UpdateStContactRelationshipInput input);
    Task Delete(Guid id);
}