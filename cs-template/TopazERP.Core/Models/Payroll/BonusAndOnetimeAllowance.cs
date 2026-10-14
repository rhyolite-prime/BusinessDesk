using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class BonusAndOnetimeAllowance : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public Guid AllowanceTypeId { get; set; }
        public string AllowanceTypeName { get; set; }
        public bool IsFixedAmount { get; set; }
        public decimal Amount { get; set; }
        public decimal Percentage { get; set; }
        public bool IsTaxable { get; set; }
        public bool IsSSF { get; set; }
        public bool IsPF { get; set; }
        public int AllowanceDays { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public int TenantId { get; set; }
    }
}
