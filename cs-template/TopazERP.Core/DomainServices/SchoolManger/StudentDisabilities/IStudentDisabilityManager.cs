using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StudentDisabilities
{
    public interface IStudentDisabilityManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(Disability studentDisability);
        Task Update(Disability studentDisability);
        Task Delete(Guid id);
        
        // student-specific methods
        Task<IEnumerable<object>> ListByStudentId(Guid studentId);
        Task <object>CreateForStudent(StudentDisability studentDisability);
        Task UpdateForStudent(StudentDisability studentDisability);
        Task DeleteForStudent(Guid id);
    }
}