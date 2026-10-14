using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ActualLevels;

public interface IActualLevelManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(ActualLevel level); 
    Task Update(ActualLevel level);
    Task Delete(Guid id);
}