using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StaffDesignations.Dto;

namespace TopazERP.Services.SchoolManager.StaffDesignations
{
    public interface IStaffDesignationAppService : Abp.Application.Services.IApplicationService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(CreateStaffDesignationInput input);
        Task Update(UpdateStaffDesignationInput input);
        Task Delete(Guid id);
    }
}