using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.TeacherSubjects.Dto;

namespace TopazERP.Services.SchoolManager.TeacherSubjects
{
    public interface ITeacherSubjectAppService : Abp.Application.Services.IApplicationService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(CreateTeacherSubjectInput input);
        Task Update(UpdateTeacherSubjectInput input);
        Task Delete(Guid id);
    }
}