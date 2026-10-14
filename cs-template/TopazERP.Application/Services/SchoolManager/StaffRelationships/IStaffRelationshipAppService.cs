using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StaffRelationships.Dto;

namespace TopazERP.Services.SchoolManager.StaffRelationships;

public interface IStaffRelationshipAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateStaffRelationshipInput input);
    Task Update(UpdateStaffRelationshipInput input);
    Task Delete(Guid id);
}