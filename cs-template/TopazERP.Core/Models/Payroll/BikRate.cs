using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class BikRate
    {
        public Guid Id { get; set; }
        public Guid BikTypeId { get; set; }
        public Guid EmployeeCategoryId { get; set; }
        public string EmployeeCategoryName { get; set; }
        public Guid AllowanceTypeId { get; set; }
        public string AllowanceTypeName { get; set; }
        public bool FixedAmount { get; set; }
        public decimal Amount { get; set; }
        public decimal PercentageBasic { get; set; }
        public decimal MaximumAmount { get; set; }
    }
}
