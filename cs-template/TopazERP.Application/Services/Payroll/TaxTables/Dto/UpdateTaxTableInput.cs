using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.TaxTables.Dto
{
   public class UpdateTaxTableInput:EntityDto<Guid>
    {
        public decimal Rate { get; set; }
        public decimal UpperLimitOfAmount { get; set; }
        public int TenantId { get; set; }
    }
}
