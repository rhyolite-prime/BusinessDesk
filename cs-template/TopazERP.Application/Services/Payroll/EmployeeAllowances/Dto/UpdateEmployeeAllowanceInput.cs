using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeAllowances.Dto
{
   public class UpdateEmployeeAllowanceInput : EntityDto<Guid>
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public Guid AllowanceTypeId { get; set; }
        public string AllowanceTypeName { get; set; }
        public decimal Amount { get; set; }
        public bool Taxable { get; set; }
        public bool IsMonthly { get; set; }
        public bool SSF { get; set; }
        public bool ProvidentFund { get; set; }
        public int AllowanceDays { get; set; }
        public int TenantId { get; set; }
    }
}
