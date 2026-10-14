using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.CustomerGroups
{
   public interface ICustomerGroupManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> Create(CustomerGroup input);
        Task Update(CustomerGroup input);
        Task Delete(Guid Id);
        Task<CustomerGroup> GetAsync(string name);
    }
}
