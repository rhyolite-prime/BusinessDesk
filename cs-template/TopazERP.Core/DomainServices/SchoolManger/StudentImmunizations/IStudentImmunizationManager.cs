using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StudentImmunizations
{
    public interface IStudentImmunizationManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(ImmunizationType immunizationType);
        Task Update(ImmunizationType immunizationType);
        Task Delete(Guid id);
        
        //student specific methods
        Task<IEnumerable<object>> ListAllByStudentId(Guid studentId);
        Task<object> CreateForStudent(StudentImmunization studentImmunization);
        Task UpdateForStudent(StudentImmunization studentImmunization);
        Task DeleteForStudent(Guid id);
    }
}