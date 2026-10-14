using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Shared.PersonnelStatuses;

public interface IPersonnelStatusManager: IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<PersonnelStatus> GetAsync(string statusName);
    Task<object> Create(PersonnelStatus entity);
    Task Update(PersonnelStatus entity);
    Task<bool> Delete(Guid Id); 
}