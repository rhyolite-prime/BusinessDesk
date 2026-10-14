using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.Ap.DebitMemo.Dto;

public class UpdateDebitMemoInput:EntityDto<Guid>
{
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; }
    public string AccountNo { get; set; }
    public Guid InvoiceId { get; set; }
    public string InvoiceNo { get; set; }
    public decimal InvoiceBalance { get; set; }
    public string InvoiceCurrencyName { get; set; }
    public decimal InvoiceBuyRate { get; set; }
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public Guid CurrencyId { get; set; }
    public string CurrencyName { get; set; }
    public string CurrencyCode { get; set; }
    public decimal BuyRate { get; set; }
    public decimal SellRate { get; set; }
    public Guid OuId { get; set; }
    public string OuName { get; set; }
    public Guid DebitGlId { get; set; }
    public string DebitGlName { get; set; }
    public Guid CreditGlId { get; set; }
    public string CreditGlName { get; set; }
    public Guid BankId { get; set; }
    public string BankName { get; set; }
    public Guid BankBranchId { get; set; }
    public string BankBranch { get; set; }
    public string ChequeNo { get; set; }
    public string ChequeDate { get; set; }
    public string ModeOfPayment { get; set; }
    public string Description { get; set; }
    public bool IsInvoiceDebit { get; set; }
    public string BatchNumber { get; set; }
    public int TenantId { get; set; }
}