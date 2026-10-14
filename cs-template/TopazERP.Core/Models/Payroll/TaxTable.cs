using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class TaxTable : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public decimal Rate { get; set; }
        public decimal UpperLimitOfAmount { get; set; }
        public int TenantId { get; set; }
    }
}
