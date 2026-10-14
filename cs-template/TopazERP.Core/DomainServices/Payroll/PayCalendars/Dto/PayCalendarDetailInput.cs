using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.PayCalendars.Dto
{
    public class PayCalendarDetailInput
    {
        public Guid Id { get; set; }
        public Guid PayCalendarId { get; set; }
        public int Days { get; set; }
        public int Month { get; set; }
    }
}
