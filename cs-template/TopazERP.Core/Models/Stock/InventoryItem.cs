using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Stock
{
   public class InventoryItem : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string Name { get; set; }
        public string ShortDescription { get; set; }
        public List<string> Images { get; set; }
        public string FullDescription { get; set; }
        public string ItemCode { get; set; }
        public Guid ItemCategoryId { get; set; }
        public string ItemCategoryName { get; set; }
        public decimal TotalValue { get; set; }
        public int MinimumOrderQuantity { get; set; }
        public string ItemDescription { get; set; }
        public int StockQuantity { get; set; }
        public decimal SellingPrice { get; set; }
        public decimal CostPrice { get; set; }
        public decimal Weight { get; set; }
        public string Dimensions { get; set; }
        public int MaxStock { get; set; }
        public int MinStock { get; set; } // add trigger to notify 
        public Guid UomId { get; set; }
        public string ItemQr { get; set; }
        public Guid WareHouseId { get; set; }
        public string WareHouseName { get; set; }
        public string UomName { get; set; }
        public Guid SupplierId { get; set; }
        public string SupplierName { get; set; }
        [Column(TypeName = "jsonb")] public StockReceiptDetail LedgerNumbers { get; set; }
        public int TenantId { get; set; }
    }
}
