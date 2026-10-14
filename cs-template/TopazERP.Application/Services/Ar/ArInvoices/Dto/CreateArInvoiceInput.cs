using TopazERP.Models.Ar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Shared;

namespace TopazERP.Services.Ar.ArInvoices.Dto;

public class CreateArInvoiceInput
{
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; }
    public string CustomerAccountNumber { get; set; }
    public string InvoiceNumber { get; set; }
    public DateTime InvoiceDate { get; set; }
    public DateTime ProjectedPayDate { get; set; }
    public string PurchaseOrderNumber { get; set; }
    public Guid AccountId { get; set; }
    public string AccountName { get; set; }
    public string BatchNumber { get; set; }
    public string VoucherNumber { get; set; }
    public decimal BuyRate { get; set; }
    public decimal SellRate { get; set; }
    public Guid CustomerGroupId { get; set; }
    public string CustomerGroupName { get; set; }
    public bool SendEmail { get; set; }
    public bool SendSms { get; set; }
    public string MinorName { get; set; }
    public bool IsMultiCurrency { get; set; }
    public decimal TotalInvoiceAmount { get; set; }
    public decimal Balance { get; set; }
    public bool VatWithHeld { get; set; }
    public Guid vatId { get; set; }
    public string vatName { get; set; }
    public decimal NewVatRate { get; set; }
    public decimal vatRate { get; set; }
    public bool vatIsApplied { get; set; }
    public decimal vatAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public Guid OuId { get; set; }
    public string OuName { get; set; }
    public Guid CurrencyId { get; set; }
    public string CurrencyName { get; set; }
  //  public decimal CurrencyCode { get; set; }
    public string currencyCode { get; set; }
    public bool IsCanceled { get; set; }
    public bool IsPosted { get; set; }
    public string AccountingPeriod { get; set; }
    public int Status { get; set; }
    public bool IsApproved { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<ArInvoiceTaxLevies> InvoiceTaxLevies { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<ArInvoiceDetail> Details { get; set; }
  
}