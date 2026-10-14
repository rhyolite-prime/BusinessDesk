using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class DeductionRate
    {
        public Guid Id { get; set; }
        public Guid DeductionTypeId { get; set; }
        public string DeductionTypeName { get; set; }
        public Guid EmployeeCategoryId { get; set; }
        public string EmployeeCategoryName { get; set; }
        public bool Prorate { get; set; }
        public bool FixedAmount { get; set; }
        public decimal Amount { get; set; }
        public decimal MaximumAmount { get; set; }
        public decimal PercentageBasic { get; set; }
    }
}
