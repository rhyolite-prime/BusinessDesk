using Abp.Application.Services;
using TopazERP.Services.Shared.Religions.Dto;
using TopazERP.Services.Shared.SupplierGroups.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.SupplierGroups
{
    public interface ISupplierGroupAppService: IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateSupplierGroupInput input);
        Task Update(UpdateSupplierGroupInput input);
        Task Delete(Guid Id);
    }
}
