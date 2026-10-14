using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ap
{
    public class ApOpeningBalance : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid SupplierId { get; set; }
        public string SupplierName { get; set; }
        public string AccountNumber { get; set; }
        public decimal Amount { get; set; } 
        public DateTime TransactionDate { get; set; }
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
        public class PostBalanceDto
    {
        public List<Guid> BalanceIds { get; set; }
    }
}