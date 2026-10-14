using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.SupplementaryItems.Dto;

namespace TopazERP.Services.SchoolManager.SupplementaryItems;

public interface ISupplementaryItemAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateSupplementaryItemInput input);
    Task Update(UpdateSupplementaryItemInput input);
    Task Delete(Guid id);
}