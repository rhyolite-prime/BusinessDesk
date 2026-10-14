using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class SalaryIncrementHistory : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public decimal CurrentSalary { get; set; }
        public decimal PreviousSalary { get; set; }
        public decimal IncrementAmount { get; set; }
        public int TenantId { get; set; }

    }
}
