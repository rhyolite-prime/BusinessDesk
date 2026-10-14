using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeDaysWorkeds.Dto
{
   public class CreateEmployeeDaysWorkedInput
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public int Days { get; set; }
        public decimal Hours { get; set; }
        public decimal Minutes { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
    }
}
