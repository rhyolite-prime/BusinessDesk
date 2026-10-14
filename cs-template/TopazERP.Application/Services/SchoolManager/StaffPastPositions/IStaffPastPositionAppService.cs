using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StaffPastPositions.Dto;

namespace TopazERP.Services.SchoolManager.StaffPastPositions;

public interface IStaffPastPositionAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateStaffPastPositionInput input);
    Task Update(UpdateStaffPastPositionInput input);
    Task Delete(Guid id);
}