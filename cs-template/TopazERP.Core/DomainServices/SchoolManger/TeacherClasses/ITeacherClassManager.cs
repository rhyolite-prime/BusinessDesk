using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.TeacherClasses
{
    public interface ITeacherClassManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(TeacherClass teacherClass);
        Task Update(TeacherClass teacherClass);
        Task Delete(Guid id);
    }
}