using TopazERP.DomainServices.Payroll.PayCalendars.Dto;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.PayCalendars
{
   public interface IPayCalendarManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task Create(PayCalendar input);
        Task Update(PayCalendar input);
        Task Delete(Guid id);
        Task<object> GetDefaultAllowanceDays();
        Task<object> CreatePayCalendarDetails(PayCalendarDetailInput input);
        Task UpdatePayCalendarDetails(PayCalendarDetailInput input);
        Task DeletePayCalendarDetails(PayCalendarDetailInput input);
    }
}
