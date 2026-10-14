using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ledger
{
   public class CoaDetail : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string AccountName { get; set; }
        public int AccountNo { get; set; }
        public string Status { get; set; }
        public Guid AccountHeaderId { get; set; }
        
        public string AccountHeaderName { get; set; }
        public Guid CurrencyId { get; set; }
        public string CurrencyName { get; set; }
        public string CurrencyCode { get; set; }
        public decimal CurrentBalance { get; set; }
        public decimal CurrentForeignBalance { get; set; }
        public int StandardAccountType { get; set; }
        public int TenantId { get; set; }
    }
}
