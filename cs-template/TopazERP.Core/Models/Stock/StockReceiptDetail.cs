using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Stock
{
   public class StockReceiptDetail
    {
        public Guid ItemId { get; set; }
        public string ItemName { get; set; }
        public string ItemQr { get; set; }
        public string ItemCode { get; set; }
        public string Description { get; set; }
        public int QuantityReceived { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TotalCost { get; set; }
        public Guid DebitAccountId { get; set; }
        public string DebitAccountName { get; set; }
        public Guid CreditAccountId { get; set; }
        public string CreditAccountName { get; set; }
        public int TenantId { get; set; }
    }
}
