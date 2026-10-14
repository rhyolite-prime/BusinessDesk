using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.DistanceGroups;

public interface IDistanceGroupManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(DistanceGroup distanceGroup); 
    Task Update(DistanceGroup distanceGroup);
    Task Delete(Guid id);
    
}