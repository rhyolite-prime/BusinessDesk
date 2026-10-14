using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.Services.SchoolManager.ClassAttendances.Dto;

namespace TopazERP.Services.SchoolManager.ClassAttendances;

public interface IAttendanceAppService:IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateAttendanceInput input);
    Task Update(UpdateAttendanceInput input);
    Task Delete(Guid id); 
    
    //cumulative
    Task<IEnumerable<object>> ListAllCumulativeAttendance();
    Task<object> CreateAttendance(CreateCumulativeAttendanceInput input);
    Task UpdateAttendance(UpdateCumulativeAttendanceInput input);
    Task DeleteAttendance(Guid id);
}