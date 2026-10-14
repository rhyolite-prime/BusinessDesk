using System;
using System.Threading.Tasks;
using TopazERP.Models.Ledger;
using System.Collections.Generic;

namespace TopazERP.DomainServices.Ledger.Imprests
{
    public interface IImprestRetirementManager : Abp.Domain.Services.IDomainService
    {
        Task Create(ImprestRetirement entity, List<ImprestRetirementDetail> details);
        Task Update(ImprestRetirement entity);
        Task<object> GetAsync(Guid id);
        Task<object> GetEmployeeImprestRetirements(Guid id);
        Task<object> ListAll();
        Task Delete(Guid id);
    }
}
