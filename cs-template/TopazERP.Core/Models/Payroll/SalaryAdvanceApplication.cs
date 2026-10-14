using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class SalaryAdvanceApplication: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeID { get; set; }
        public string EmployeeName { get; set; }
        public DateTime ApplyDate { get; set; }
        public DateTime ApprovedDate { get; set; }
        public decimal LoanAmount { get; set; }
        public Guid LoanTypeId { get; set; }
        public Guid LoanTypeName { get; set; }
        public string Reasons { get; set; }
        public string LoanStatus { get; set; }
        //for authentication purposes
        public long UserId { get; set; }
        public int TenantId { get; set; }
    }
}
