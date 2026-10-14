using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.PayCalendars.Dto
{
   public class CreatePayCalendarInput
    {
        public int Year { get; set; }
        public List<PayCalendarDetail> PayCalendarDetails { get; set; }
    }
}
