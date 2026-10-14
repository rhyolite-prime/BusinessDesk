using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.RemarkByTeachers;

public interface IRemarkByTeacherManager:IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(RemarksByTeacher remarksByTeacher);
    Task Update(RemarksByTeacher remarksByTeacher);
    
}