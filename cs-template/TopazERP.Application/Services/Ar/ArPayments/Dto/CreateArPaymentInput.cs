using System;
using System.Collections.Generic;
using TopazERP.Models.Ar;

namespace TopazERP.Services.Ar.ArPayments.Dto;

public class CreateArPaymentInput
{
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; }
    public DateTime BatchDate { get; set; }
    public decimal AmountToPay { get; set; }
    public Guid CurrencyId { get; set; }
    public string CurrencyName { get; set; }
    public string CurrencyCode { get; set; }
    public string ModeOfPayment { get; set; }
    public Guid OuId { get; set; }
    public string OuName { get; set; }
    public decimal BuyRate { get; set; }
    public decimal SellRate { get; set; }
    public string ReferenceNo { get; set; }
    public Guid BankAccountId { get; set; }
    public string BankAccountName { get; set; }
    public string BatchNumber { get; set; }
    public string BatchDescription { get; set; }
    public string ChequeNumber { get; set; }
    public Guid InvoiceTypeId { get; set; }
    public string InvoiceTypeName { get; set; }
    public DateTime PaymentDate { get; set; }
    public string MinorName { get; set; }
    public bool IsAutomatic { get; set; }
    public bool IsPosted { get; set; }
    public bool IsCanceled { get; set; }
    public Guid BankId { get; set; }
    public string BankName { get; set; }
    public Guid BankBranchId { get; set; }
    public string BankBranch { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<ArInvoice> InvoiceList { get; set; }
    
}