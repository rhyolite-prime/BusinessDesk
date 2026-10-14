using TopazERP.Models.Ledger;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Ledger.CoaDetails
{
   public interface ICoaDetailManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListActiveAccounts();
        Task<object> ListLocalAccounts();
        Task<object> Create(CoaDetail entity);
        Task<object> Update(CoaDetail entity);
        Task Delete(Guid id);
    }
}
