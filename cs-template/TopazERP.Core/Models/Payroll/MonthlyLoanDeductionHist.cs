using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class MonthlyLoanDeductionHist : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public string EmployeeDepartment { get; set; }
        public string EmployeeCategory { get; set; }
        public Guid EmployeeLoanId { get; set; }
        public string EmployeeLoanName { get; set; }
        public string Description { get; set; }
        public Guid LoanTypeId { get; set; }
        public string LoanTypeName { get; set; }
        public int LoanPeriod { get; set; }
        public decimal LoanAmount { get; set; }
        public decimal RepayAmount { get; set; }
        public decimal ClosingBalance { get; set; }
        public decimal OpeningBalance { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public DateTime ScheduleDate { get; set; }
        public decimal MonthlyPayment { get; set; }
        public decimal PrincipalPayment { get; set; }
        public decimal InterestPayment { get; set; }
        public decimal PrincipalBalance { get; set; }
        public decimal InterestPlusPrincipalBalance { get; set; }
        public Guid EmployeeLoanRepaymentScheduleId { get; set; }
        
        public int TenantId { get; set; }
    }
}
