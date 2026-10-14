using System;
using System.Threading.Tasks;
using TopazERP.Models.Ledger;

namespace TopazERP.DomainServices.Ledger.Imprests
{
    public interface IImprestRefundManager : Abp.Domain.Services.IDomainService
    {
        Task Create(ImprestRefund entity);
        Task Update(ImprestRefund entity);
        Task<object> GetAsync(Guid id);
        Task<object> GetEmployeeImprestRefunds(Guid id);
        Task<object> ListAll();
        Task Delete(Guid id);
    }
}
