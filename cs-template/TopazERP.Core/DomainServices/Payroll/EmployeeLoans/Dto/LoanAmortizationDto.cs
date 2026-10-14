using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeLoans.Dto
{
    public class LoanAmortizationDto
    {
        public decimal AmountPaid { get; set; }
        public Guid BankGlAccountId { get; set; }
        public Guid EmployeeLoanId { get; set; }

    }
}
