using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.DomainServices.SchoolManger.ClassAttendances.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ClassAttendances;

public interface IAttendanceManager:IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(Attendance entity);
    Task Update(Attendance entity);
    Task Delete(Guid id);
    
    //cumulative
    Task<IEnumerable<object>> ListAllCumulativeAttendance();
    Task<object> CreateAttendance(CumulativeAttendance entity);
    Task UpdateAttendance(CumulativeAttendance entity);
    Task DeleteAttendance(Guid id);
    
}