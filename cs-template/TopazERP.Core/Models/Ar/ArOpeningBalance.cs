using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ar
{
   public class ArOpeningBalance : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid CustomerId { get; set; }
        public string CustomerName { get; set; }
        public DateTime TransactionDate { get; set; }
        public decimal Amount { get; set; }
        public Guid CurrencyId { get; set; }
        public string CurrencyName { get; set; }
        public string CurrencyCode { get; set; }
        public decimal BuyRate { get; set; }
        public decimal SellRate { get; set; }
        public Guid OuId { get; set; }
        public string OuName { get; set; }
        public bool IsPosted { get; set; }
        public int TenantId { get; set; }
    }
   
    public class PostArBalanceDto
    {
        public List<Guid> BalanceIds { get; set; }
    }
}
