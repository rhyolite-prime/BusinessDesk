using System;

namespace TopazERP.DomainServices.Ar.Reports.Dto;

public class ArStatementRecord
{
    public string Type { get; set; }
    public string ContactPerson { get; set; }
    public string ContactPhone { get; set; }
    public string CustomerName { get; set; }
    public string SupplierName { get; set; }
    public string AccountNumber { get; set; }
    public string InvoiceNumber { get; set; }
    public string InvoiceNo { get; set; }
    public string InvoiceDate { get; set; }
    public DateTime TransactionDate { get; set; }
    public decimal? Balance { get; set; }
    public decimal? TotalInvoiceAmount { get; set; }
    public decimal? PaidAmount { get; set; }
    public decimal? AmountPaid { get; set; }
    public string PaymentDate { get; set; }
    public string CurrencyName { get; set; }
    public decimal? BuyRate { get; set; }
    public string Description { get; set; }
    public string OuName { get; set; }
    public Guid OuId { get; set; }
    public decimal? Outstanding { get; set; }
    
}