using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StaffPastEmployments.Dto;

namespace TopazERP.Services.SchoolManager.StaffPastEmployments;

public interface IStaffPastEmploymentAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateStaffPastEmploymentInput input);
    Task Update(UpdateStaffPastEmploymentInput input);
    Task Delete(Guid id);
}