using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.TransportationLocations;

public interface ITransportationLocationManager : Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(TransportationLocation transportationLocation);
    Task Update(TransportationLocation transportationLocation);
    Task Delete(Guid id);
}