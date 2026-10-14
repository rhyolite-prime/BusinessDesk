using TopazERP.Models.Ledger;
using System;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Ledger.CoaHierachies
{
   public interface ICoaHierachyManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> Create(CoaHierachy input);
        Task Update(CoaHierachy input);
        Task Delete(Guid id);
    }
}
