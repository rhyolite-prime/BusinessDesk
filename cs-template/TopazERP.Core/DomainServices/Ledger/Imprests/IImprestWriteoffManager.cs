using System;
using System.Threading.Tasks;
using TopazERP.Models.Ledger;

namespace TopazERP.DomainServices.Ledger.Imprests
{
    public interface IImprestWriteoffManager : Abp.Domain.Services.IDomainService
    {
        Task Create(ImprestWriteoff entity);
        Task Update(ImprestWriteoff entity);
        Task<object> GetAsync(Guid id);
        Task<object> GetEmployeeImprestWriteOffs(Guid id);
        Task<object> ListAll();
        Task Delete(Guid id);
    }
}
