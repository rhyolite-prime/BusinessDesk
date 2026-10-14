using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.AssignSubjects;

public interface IAssignSubjectManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(AssignedSubject assignedSubject);
    Task Update(AssignedSubject assignedSubject);
    Task Delete(Guid id);
}