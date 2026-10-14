using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.DistanceUnits;

public interface IDistanceUnitManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(DistanceUnit unit); 
    Task Update(DistanceUnit unit);
    Task Delete(Guid id);
}