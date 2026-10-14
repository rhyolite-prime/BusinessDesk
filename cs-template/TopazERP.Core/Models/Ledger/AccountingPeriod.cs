using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ledger
{
   public class AccountingPeriod : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public DateTime LastClosedDate { get; set; }
        public DateTime AccountingPeriodStartDate { get; set; }
        public DateTime AccountingPeriodEndDate { get; set; }
        public bool IsClosed { get; set; }
        public int Period { get; set; }
        public int TenantId { get; set; }
    }
}
