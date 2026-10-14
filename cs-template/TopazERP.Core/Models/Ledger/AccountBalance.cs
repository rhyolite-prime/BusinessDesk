using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ledger
{
   public class AccountBalance : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid AccountId { get; set; }
        public string AccountName { get; set; }
        public decimal CreditBalance { get; set; }
        public decimal DebitBalance { get; set; }
        public decimal CreditForeign { get; set; }
        public decimal DebitForeign { get; set; }
        public Guid OuId { get; set; }
        public string OuName { get; set; }
        public Guid CurrencyId { get; set; }
        public string CurrencyName { get; set; }
        public string CurrencyCode { get; set; }
        public decimal BuyRate { get; set; }
        public decimal SellRate { get; set; }
        public int TenantId { get; set; }
    }
}
