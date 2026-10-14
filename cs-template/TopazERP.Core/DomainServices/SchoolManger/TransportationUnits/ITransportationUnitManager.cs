using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.TransportationUnits;

public interface ITransportationUnitManager : Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(TransportationUnit transportationUnit);
    Task Update(TransportationUnit transportationUnit);
    Task Delete(Guid id);
}