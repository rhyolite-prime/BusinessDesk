using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Locations;

public interface ILocationManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(Location location); 
    Task Update(Location location);
    Task Delete(Guid id);
    
}