using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Stock
{
   public class ReturnIssuedStockDetail : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string Description { get; set; }
        public Guid FromOuId { get; set; }
        public string FromOuName { get; set; }
        public Guid ToOuId { get; set; }
        public string ToOuName { get; set; }
        public int QuantityIssued { get; set; }
        public int QuantityReturned { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TotalCost { get; set; }
        public int TenantId { get; set; }

    }
}
