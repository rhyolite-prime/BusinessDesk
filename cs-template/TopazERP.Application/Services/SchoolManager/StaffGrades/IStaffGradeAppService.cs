using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StaffGrades.Dto;

namespace TopazERP.Services.SchoolManager.StaffGrades
{
    public interface IStaffGradeAppService : Abp.Application.Services.IApplicationService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(CreateStaffGradeInput input);
        Task Update(UpdateStaffGradeInput input);
        Task Delete(Guid id);
    }
}