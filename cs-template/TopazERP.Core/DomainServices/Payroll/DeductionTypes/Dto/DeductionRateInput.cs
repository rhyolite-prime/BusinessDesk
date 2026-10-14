using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.DeductionTypes.Dto
{
    public class DeductionRateInput
    {
        public Guid Id { get; set; }
        public Guid DeductionTypeId { get; set; }
        public Guid EmployeeCategoryId { get; set; }
        public bool Prorate { get; set; }
        public bool FixedAmount { get; set; }
        public decimal Amount { get; set; }
        public decimal MaximumAmount { get; set; }
        public decimal PercentageBasic { get; set; }
    }

    public class EmployeeDeductionRate
    {
        public Guid DeductionTypeId { get; set; }
        public bool FixedAmount { get; set; }
        public decimal PercentageBasic { get; set; }
        public decimal Amount { get; set; }
        public decimal MaximumAmount { get; set; }
    }
}
