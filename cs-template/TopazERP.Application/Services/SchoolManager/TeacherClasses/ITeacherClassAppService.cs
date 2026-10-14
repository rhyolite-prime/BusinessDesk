using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.TeacherClasses.Dto;

namespace TopazERP.Services.SchoolManager.TeacherClasses
{
    public interface ITeacherClassAppService : Abp.Application.Services.IApplicationService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(CreateTeacherClassInput input);
        Task Update(UpdateTeacherClassInput input);
        Task Delete(Guid id);
    }
}