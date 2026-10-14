using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.SchoolGroups.Dto;

namespace TopazERP.Services.SchoolManager.SchoolGroups;

public interface ISchoolGroupAppService : Abp.Application.Services.IApplicationService
{
    // Groups
    Task<IEnumerable<object>> ListAllGroups();
    Task<object> CreateGroup(CreateSchoolGroupInput input);
    Task UpdateGroup(UpdateSchoolGroupInput input);
    Task DeleteGroup(Guid id);

    // Positions
    Task<IEnumerable<object>> ListAllPositions();
    Task<object> CreatePosition(CreateSchoolGroupPositionInput input);
    Task UpdatePosition(UpdateSchoolGroupPositionInput input);
    Task DeletePosition(Guid id);
}