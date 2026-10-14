using TopazERP.Models.Ledger;
using System;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Ledger.Imprests
{
   public interface IImprestManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task Create(Imprest input);
        Task Update(Imprest input);
        Task<object> GetEmployeeImprests(Guid employeeId);
        Task Delete(Guid id);
    }
}
