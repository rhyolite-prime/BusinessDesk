using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StudentMedicals;

public interface IStudentMedicalManager : Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListByStudentId(Guid studentId);
    Task<object> Create(StudentMedical studentMedical);
    Task Update(StudentMedical studentMedical);
    Task Delete(Guid id);
}