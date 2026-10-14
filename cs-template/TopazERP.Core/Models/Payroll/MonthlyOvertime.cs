using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class MonthlyOvertime : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid OvertimeTypeId { get; set; }
        public string OvertimeTypeName { get; set; }
        public int Month { get; set; }
        public string EmployeeDepartment { get; set; }
        public string EmployeeCategory { get; set; }
        public int Year { get; set; }
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public decimal Amount { get; set; }
        public decimal OvertimeHours { get; set; }
        public int TenantId { get; set; }
    }
}
