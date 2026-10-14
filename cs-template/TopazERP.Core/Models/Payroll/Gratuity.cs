using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class Gratuity : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public decimal MinYears { get; set; }
        public decimal MaxYears { get; set; }
        public decimal Factor { get; set; }
        public int TenantId { get; set; }
    }
}
