using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Stock
{
   public class PurchaseOrder : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string PurchaseOrderNo { get; set; }
        public Guid SupplierId { get; set; }
        public string SupplierName { get; set; }
        public string SupplierAccountNumber { get; set; }
        public DateTime OrderDate { get; set; }
        public Guid CurrencyId { get; set; }
        public string CurrencyName { get; set; }
        public string CurrencyCode { get; set; }
        public decimal BuyRate { get; set; }
        public string RequestedBy { get; set; }
        public string ApprovedBy { get; set; }
        public DateTime DateExpected { get; set; }
        public string VendorRefNo { get; set; }
        public decimal SubTotal { get; set; }
        public decimal Total { get; set; }
        public decimal GetflAmount { get; set; }
        public decimal VatAmount { get; set; }
        public decimal NhilAmount { get; set; }
        public string DeliveryAddress { get; set; }
        public string TermsAndConditions { get; set; }
        public string Notes { get; set; }
        [Column(TypeName = "jsonb")] public List<PurchaseOrderDetail> Details { get; set; }
        public int TenantId { get; set; }
    }
}
