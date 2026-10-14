using Abp.Application.Services;
using TopazERP.Services.Shared.CostCenters.Dto;
using TopazERP.Services.Shared.Departments.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Departments
{
    public interface IDepartmentAppService: IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateDepartmentInput input);
        Task Update(UpdateDepartmentInput input);
        Task Delete(Guid Id);
    }
}
