using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StaffQualifications.Dto;

namespace TopazERP.Services.SchoolManager.StaffQualifications;

public interface IStaffQualificationAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateStaffQualificationInput input);
    Task Update(UpdateStaffQualificationInput input);
    Task Delete(Guid id);
}