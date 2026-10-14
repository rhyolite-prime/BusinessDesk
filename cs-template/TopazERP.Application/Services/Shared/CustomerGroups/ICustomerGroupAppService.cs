using Abp.Application.Services;
using TopazERP.Services.Shared.CustomerGroups.Dto;
using TopazERP.Services.Shared.Religions.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.CustomerGroups
{
    public interface ICustomerGroupAppService: IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateCustomerGroupInput input);
        Task Update(UpdateCustomerGroupInput input);
        Task Delete(Guid Id);
    }
}
