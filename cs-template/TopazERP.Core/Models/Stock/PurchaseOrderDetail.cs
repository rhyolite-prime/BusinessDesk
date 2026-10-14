using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Stock
{
   public class PurchaseOrderDetail
    {
        public Guid ItemId { get; set; }
        public string ItemCode { get; set; }
        public string ItemQr { get; set; }
        public string ItemName { get; set; }
        public string ItemDescription { get; set; }
        public int Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TotalAmount { get; set; }
    }
}
