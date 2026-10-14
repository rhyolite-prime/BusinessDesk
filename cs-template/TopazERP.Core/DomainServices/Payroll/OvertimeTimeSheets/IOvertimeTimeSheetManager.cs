using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.OvertimeTimeSheets
{
   public interface IOvertimeTimeSheetManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListAll(int month,int year);
        Task Create(OvertimeTimeSheet input);
        Task Update(OvertimeTimeSheet input);
        Task Delete(Guid Id);
    }
}
