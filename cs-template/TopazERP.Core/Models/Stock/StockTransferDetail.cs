using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Stock
{
   public class StockTransferDetail
    {
        public Guid ItemId { get; set; }
        public string ItemName { get; set; }
        public string ItemQr { get; set; }
        public string ItemCode { get; set; }
        public string Description { get; set; }
        public decimal UnitCost { get; set; }
        public int QuantityOnHand { get; set; }
        public int QuantityTransfered { get; set; }
        public int TenantId { get; set; }

    }
}
