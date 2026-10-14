using System;
using System.Collections.Generic;
using TopazERP.Models.Shared;

namespace TopazERP.Models.Ap
{
    public class ApInvoice : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid SupplierId { get; set; }
        public string SupplierName { get; set; }
        public string AccountNumber { get; set; }
        public string BatchNumber { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public DateTime ProjectedPayDate { get; set; }
        public decimal Balance { get; set; }
        public string PurchaseOrderNumber { get; set; }
        public string VoucherNumber { get; set; }
        public Guid LiabilityAccountId { get; set; }
        public string LiabilityAccountName { get; set; }
        public Guid CurrencyId { get; set; }
        public string CurrencyName { get; set; }
        public string CurrencyCode { get; set; }
        public string MinorName { get; set; }
        public bool IsMultiCurrency { get; set; }
        public bool SendEmail { get; set; }
        public bool SendSms { get; set; }
        public decimal BuyRate { get; set; }
        public decimal SellRate { get; set; }
        public decimal TotalInvoiceAmount { get; set; }
        public bool VatWithHeld { get; set; }
        public Guid vatId { get; set; }
        public string vatName { get; set; }
        public decimal NewVateRate { get; set; }
        public decimal vatRate { get; set; }
        public bool vatIsApplied { get; set; }
        public decimal vatAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal WithheldAmount { get; set; }

        public Guid OuId { get; set; }
        public string OuName { get; set; }
        public bool IsCanceled { get; set; }
        public string CanceledBy { get; set; }
        public DateTime? CanceledDate { get; set; }
        public bool IsPosted { get; set; }
        
        public string AccountingPeriod { get; set; }
        public int Status { get; set; }
        public bool IsApproved { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
        public List<InvoiceTaxLevies> InvoiceTaxLevies { get; set; }
        
        [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
        public List<ApInvoiceDetail> InvoiceDetails { get; set; }
        public int TenantId { get; set; }
    }
}