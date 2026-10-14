using TopazERP.Services.Payroll.OvertimeTimeSheets.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.OvertimeTimeSheets
{
   public interface IOvertimeTimeSheetAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> ListAll(int month, int year);
        Task Create(CreateOvertimeTimeSheetInput input);
        Task Update(UpdateOvertimeTimeSheetInput input);
        Task Delete(Guid Id);
    }
}
