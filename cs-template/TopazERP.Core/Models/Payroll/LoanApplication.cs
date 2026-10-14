using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class LoanApplication : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public long UserId { get; set; }
        public DateTime ApplyDate { get; set; }
        public DateTime ApprovedDate { get; set; }
        public decimal LoanAmount { get; set; }
        public Guid LoanTypeId { get; set; }
        public string LoanTypeName { get; set; }
        public string LoanNotes { get; set; }
        public string LoanStatus { get; set; }
        public int LoanDuration { get; set; }
        public DateTime DeductionStarts { get; set; }
        public int TenantId { get; set; }
    }
}
