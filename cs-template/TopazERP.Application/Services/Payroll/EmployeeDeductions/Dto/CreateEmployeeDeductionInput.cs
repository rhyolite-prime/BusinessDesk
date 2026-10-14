using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeDeductions.Dto
{
   public class CreateEmployeeDeductionInput
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public Guid DeductionTypeId { get; set; }
        public string DeductionTypeName { get; set; }
        public decimal Amount { get; set; }
        public decimal EmployerAmount { get; set; }
    }

    public class ImportEmployeeDeductionInput
    {
        public string EmployeeIdentifier { get; set; }
        public string DeductionTypeName { get; set; }
        public decimal Amount { get; set; }
        public decimal EmployerAmount { get; set; }
    }
}
