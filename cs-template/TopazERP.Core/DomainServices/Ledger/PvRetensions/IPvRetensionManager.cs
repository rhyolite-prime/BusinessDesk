using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Ledger;

namespace TopazERP.DomainServices.Ledger.PvRetensions
{
   public interface IPvRetensionManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll(Guid paymentVoucherId);
        Task Create(PvRetension input);
        Task Update(PvRetension input);
        Task Delete(Guid id);
    }
}
