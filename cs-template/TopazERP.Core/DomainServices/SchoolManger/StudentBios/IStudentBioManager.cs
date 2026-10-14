using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StudentBios;

public interface IStudentBioManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(StudentInfo studentBio);
    Task<object> Import(StudentInfo studentBio);
    Task Update(StudentInfo studentBio);
    Task Delete(Guid id);
    Task<object> GetById(Guid id);
    Task<string> GenerateStudentIdAsync();
    Task<string> GenerateIndexNoAsync();

}