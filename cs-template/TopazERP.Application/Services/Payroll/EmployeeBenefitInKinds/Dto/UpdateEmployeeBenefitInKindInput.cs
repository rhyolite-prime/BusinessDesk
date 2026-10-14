using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeBenefitInKinds.Dto
{
   public class UpdateEmployeeBenefitInKindInput:EntityDto<Guid>
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public Guid BenefitInKindTypeId { get; set; }
        public string BenefitInKindTypeName { get; set; }
        public decimal Amount { get; set; }
        public int TenantId { get; set; }
    }
}
