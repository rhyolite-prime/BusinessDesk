using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class EmployeeLoanRepaymentSchedule : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public Guid EmployeeLoanId { get; set; }
        public string EmployeeLoanName { get; set; }
        public DateTime ScheduleDate { get; set; }
        public decimal MonthlyPayment { get; set; }
        public decimal PrincipalPayment { get; set; }
        public decimal InterestPayment { get; set; }
        public decimal PrincipalBalance { get; set; }
        public decimal InterestPlusPrincipalBalance { get; set; }
        public bool IsPaid { get; set; }
        public int TenantId { get; set; }
        public int Period { get; set; }
    }
}
