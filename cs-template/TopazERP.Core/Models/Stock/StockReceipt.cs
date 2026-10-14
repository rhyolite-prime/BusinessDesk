using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Stock
{
   public class StockReceipt : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid SupplierId { get; set; }
        public string SupplierName { get; set; }
        public DateTime DateReceived { get; set; }
        public string BatchNumber { get; set; }
        public string GrvNumber { get; set; }
        public string CurrencyName { get; set; }
        public string CurrencyCode { get; set; }
        public Guid CurrencyId { get; set; }
        public decimal BuyRate { get; set; }
        public Guid WarehouseId { get; set; }
        public string WarehouseName { get; set; }
        public Guid OuId { get; set; }
        public string OuName { get; set; }
        public string ModeOfPayment { get; set; }
        public string ChequeNo { get; set; }
        public decimal SubTotal { get; set; }
        public decimal VatAmount { get; set; }
        public decimal NhilAmount { get; set; }
        public decimal Total { get; set; }
        public bool IsPosted { get; set; }
        [Column(TypeName = "jsonb")] public List<StockReceiptDetail> Details { get; set; }
        public int TenantId { get; set; }
    }
}
