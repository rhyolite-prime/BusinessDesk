using TopazERP.Services.Shared.Customers.Dto;
using TopazERP.Services.Shared.Suppliers.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Suppliers
{
    public interface ISupplierAppService : Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> ListAllByGroup(Guid groupId);
        Task<object> Create(CreateSupplierInput input);
        Task Update(UpdateSupplierInput input);
        Task Delete(Guid Id);
    }
}
