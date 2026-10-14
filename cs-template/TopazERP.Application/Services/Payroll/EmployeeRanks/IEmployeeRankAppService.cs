using TopazERP.Services.Payroll.EmployeeRanks.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeRanks
{
   public interface IEmployeeRankAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateEmployeeRankInput input);
        Task Update(UpdateEmployeeRankInput input);
        Task<bool> Delete(Guid Id);
    }
}
