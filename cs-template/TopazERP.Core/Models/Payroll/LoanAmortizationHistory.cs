using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
    public class LoanAmortizationHistory : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public decimal AmountPaid { get; set; }
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public string EmployeeDepartment { get; set; }
        public string EmployeeCategory { get; set; }
        public DateTime LoanDate { get; set; }
        public DateTime DeductionStarts { get; set; }
        public Guid LoanTypeId { get; set; }
        public string LoanTypeName { get; set; }
        public decimal LoanAmount { get; set; }
        public int Duration { get; set; }
        public decimal MonthlyDeduction { get; set; }
        public bool ChargeInterest { get; set; }
        public decimal CurrentBalance { get; set; }
        public decimal AnnualInterestRate { get; set; }
        public string InterestType { get; set; }
        public decimal InterestCharges { get; set; }
        public bool IsApproved { get; set; }
        public string Status { get; set; }
        public int TenantId { get; set; }

    }
}
