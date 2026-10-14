using TopazERP.DomainServices.Payroll.OvertimeTypes.Dto;
using TopazERP.Services.Payroll.OvertimeTypes.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.OvertimeTypes
{
   public interface IOvertimeTypeAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateOvertimeTypeInput input);
        Task Update(UpdateOvertimeTypeInput input);
        Task Delete(Guid Id);

        //rates
        Task DeleteOvertimeRate(OvertimeRateInput input);
        Task UpdateOvertimeRate(OvertimeRateInput input);
        Task<object> CreateOvertimeRate(OvertimeRateInput input);
    }
}
