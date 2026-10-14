using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.TeacherSubjects
{
    public interface ITeacherSubjectManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(TeacherSubject teacherSubject);
        Task Update(TeacherSubject teacherSubject);
        Task Delete(Guid id);
    }
}