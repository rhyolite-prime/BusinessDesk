using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeSalaryAdvances.Dto
{
   public class CreateEmployeeSalaryAdvanceInput
    {
        public Guid EmployeeId { get; set; }
        [MaxLength(100)]
        public string EmployeeIdentifier { get; set; }
        [MaxLength(100)]
        public string EmployeeName { get; set; }
        public DateTime LoanDate { get; set; }
        public Guid LoanTypeId { get; set; }
        [MaxLength(100)]
        public string LoanTypeName { get; set; }
        public decimal Amount { get; set; }
        public bool IsApproved { get; set; }
        [MaxLength(20)]
        public string Status { get; set; }
        
        public bool IsPaid { get; set; }
    }
}
