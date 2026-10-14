using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Customers
{
    public interface ICustomerManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListAllByGroup(Guid groupId);
        Task<object> Create(Customer input);
        Task<object> Update(Customer input);
        Task Delete(Guid Id);
        Task<Customer> GetAsync(string customerName);

    }
}
