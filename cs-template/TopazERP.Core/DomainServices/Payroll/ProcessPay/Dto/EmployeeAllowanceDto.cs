using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.ProcessPay.Dto
{
    public class EmployeeAllowanceDto
    {
        public decimal MaximumAmount { get; set; }
        public decimal AllowanceAmount { get; set; }
    }
}
