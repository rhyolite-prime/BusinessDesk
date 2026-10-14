using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StudentAllergies
{
    public interface IStudentAllergyManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(AllergyType studentAllergy);
        Task Update(AllergyType studentAllergy);
        Task Delete(Guid id);
        
        // student allergy specific methods
        Task<IEnumerable<object>> ListByStudentId(Guid studentId);
        Task<object> CreateStudentAllergy(StudentAllergy studentAllergy);
        Task UpdateStudentAllergy(StudentAllergy studentAllergy);
        Task DeleteStudentAllergy(Guid id);
    }
}