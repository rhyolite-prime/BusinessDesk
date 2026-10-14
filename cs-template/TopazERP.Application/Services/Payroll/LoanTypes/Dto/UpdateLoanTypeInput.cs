using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.LoanTypes.Dto
{
   public class UpdateLoanTypeInput: EntityDto<Guid>
    {
        public string Name { get; set; }
        public bool ChargeInterest { get; set; }
        public int TenantId { get; set; }
    }
}
