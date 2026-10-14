using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeDeductions.Dto
{
   public class UpdateEmployeeDeductionInput:EntityDto<Guid>
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public Guid DeductionTypeId { get; set; }
        public string DeductionTypeName { get; set; }
        public decimal Amount { get; set; }
        public decimal EmployerAmount { get; set; }
        public int TenantId { get; set; }
    }
}
