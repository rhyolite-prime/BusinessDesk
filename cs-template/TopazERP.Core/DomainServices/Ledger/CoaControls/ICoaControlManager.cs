using TopazERP.Models.Ledger;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Ledger.CoaControls
{
   public interface ICoaControlManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListAll(Guid id);
        Task<object> Create(CoaControl input);
        Task Update(CoaControl input);
        Task Delete(Guid Id);
    }
}
