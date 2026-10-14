using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Shared
{
   public class SmsHistory: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string Message { get; set; }
        public decimal Rate { get; set; }
        public string Recipient { get; set; }
        public int TenantId { get; set; }

    }
}
