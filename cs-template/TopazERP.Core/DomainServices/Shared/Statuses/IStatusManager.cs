using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Statuses;

public interface IStatusManager:  Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(Status entity);
    Task Update(Status entity);
    Task<Status> GetAsync(string name);
    Task Delete(Guid id);
}