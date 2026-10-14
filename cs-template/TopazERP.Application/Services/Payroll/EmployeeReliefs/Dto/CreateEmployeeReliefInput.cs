using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeReliefs.Dto
{
   public class CreateEmployeeReliefInput
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public Guid ReliefTypeId { get; set; }
        public string ReliefTypeName { get; set; }
        public decimal Amount { get; set; }
    }
}
