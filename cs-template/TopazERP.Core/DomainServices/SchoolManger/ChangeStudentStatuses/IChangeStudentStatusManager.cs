using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ChangeStudentStatuses;

public interface IChangeStudentStatusManager: Abp.Domain.Services.IDomainService
{
    Task<object> CreateStudentStatus(StatusChange input); 
    Task UpdateStudentStatus(StatusChange input);
    
    
}