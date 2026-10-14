using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Shared
{
   public class Currency : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string CurrencyName { get; set; }
        public string CurrencyCode { get; set; }
        public string MinorName { get; set; }
        public decimal BuyRate { get; set; }
        public decimal SellRate { get; set; }
        public bool IsDefault { get; set; }
        [Column(TypeName = "jsonb")] public List<CurrencyRate> Rates { get; set; }
        public int TenantId { get; set; }

    }
}
