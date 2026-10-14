using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StudentStatuses;

public interface IStudentStatusManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(StudentStatus studentStatus);
    Task Update(StudentStatus studentStatus);
    Task Delete(Guid id);
    
}