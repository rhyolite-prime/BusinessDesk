using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Shared.TaxLevies;

public interface ITaxLevyManager: Abp.Domain.Services.IDomainService
{
    Task<object> ListAll(string type);
    Task Create(TaxLevy entity);
    Task Update(TaxLevy entity);
    Task<TaxLevy> GetAsync(string name);
    Task Delete(Guid id);
}