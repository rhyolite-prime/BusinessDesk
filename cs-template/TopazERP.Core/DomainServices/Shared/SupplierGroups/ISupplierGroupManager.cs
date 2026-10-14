using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.SupplierGroups
{
   public interface ISupplierGroupManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> Create(SupplierGroup input);
        Task Update(SupplierGroup input);
        Task Delete(Guid Id);
        Task<SupplierGroup> GetAsync(string name);
    }
}
