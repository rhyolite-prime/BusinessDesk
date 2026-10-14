using System;
using System.Collections.Generic;
using TopazERP.Models.Ap;

namespace TopazERP.DomainServices.Ap.ApPayments.Dto;

public class ApInvoiceListInput
{
    public Guid paymenId { get; set; }
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
    public bool SendEmail { get; set; }
    public bool SendSms { get; set; }
    public decimal BuyRate { get; set; }
    public decimal SellRate { get; set; }
    public decimal TotalInvoiceAmount { get; set; }
    public bool VatWithHeld { get; set; }
    public Guid vatId { get; set; }
    public string vatName { get; set; }
    public decimal vatRate { get; set; }
    public bool vatIsApplied { get; set; }
    public decimal NewVateRate { get; set; }
    public List<InvoiceTaxLevies> InvoiceTaxLevies { get; set; }
    public List<ApInvoiceDetail> InvoiceDetails { get; set; }
    public int TenantId { get; set; }
}
