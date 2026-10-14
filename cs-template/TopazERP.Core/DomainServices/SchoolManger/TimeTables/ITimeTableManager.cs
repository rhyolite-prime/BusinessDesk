using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.TimeTables;

public interface ITimeTableManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(TimeTable timeTable);
    Task Update(TimeTable timeTable);
    Task Delete(Guid id);
    
}