using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.PtaPositions;

public interface IPtaPositionManager : Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(PtaPosition ptaPosition);
    Task Update(PtaPosition ptaPosition);
    Task Delete(Guid id);
}