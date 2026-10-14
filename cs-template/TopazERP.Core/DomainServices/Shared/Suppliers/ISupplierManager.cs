using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Suppliers
{
   public interface ISupplierManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListAllByGroup(Guid groupId);
        Task<object> Create(Supplier input);
        Task Update(Supplier input);
        Task Delete(Guid Id);
        
        Task<Supplier> GetAsync(string supplierName);
    }
}
