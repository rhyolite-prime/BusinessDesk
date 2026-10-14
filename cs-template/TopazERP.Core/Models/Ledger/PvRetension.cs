using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ledger
{
   public class PvRetension : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string Description { get; set; }
        public Guid VoucherHeaderId { get; set; }
        public Guid CreditAccountId { get; set; }
        public string CreditAccountName { get; set; }
        public bool IsPercentage { get; set; }
        public decimal Amount { get; set; }
        public decimal TotalAmount { get; set; }
        public int TenantId { get; set; }
    }
}
