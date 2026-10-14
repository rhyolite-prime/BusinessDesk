using Abp.Application.Services;
using TopazERP.Services.Shared.CustomerGroups.Dto;
using TopazERP.Services.Shared.Customers.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Customers
{
    public interface ICustomerAppService: IApplicationService
    {
        Task<object> ListAll();
        Task<object> ListAllByGroup(Guid groupId);
        Task<object> Create(CreateCustomerInput input);
        Task<object>  Update(UpdateCustomerInput input);
        Task Delete(Guid Id);
        
        
    }
}
