using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StaffBios.Dto;

namespace TopazERP.Services.SchoolManager.StaffBios
{
    public interface IStaffBioAppService : Abp.Application.Services.IApplicationService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(CreateStaffBioInput input);
        Task Update(UpdateStaffBioInput input);
        Task Delete(Guid id);
        // get staff bio by id
        Task<object> GetById(Guid id);
    }
}