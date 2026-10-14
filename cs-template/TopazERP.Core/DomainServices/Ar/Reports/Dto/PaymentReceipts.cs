using System;
using TopazERP.Notifications.Dto;

namespace TopazERP.DomainServices.Ar.Reports.Dto;

public class PaymentReceipts
{
    public string CustomerName { get; set; }
    public string InvoiceNo { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentDate { get; set; }
    public string AmountInWords { get; set; }
    public string ModeOfPayment { get; set; }
    public string ChequeNo { get; set; }
    public string CurrencyName { get; set; }
    public string CurrencyCode { get; set; }
    public string ReceiptNo { get; set; }
    public string BankName { get; set; }
    public string BankBranch { get; set; }
    public SmtpCredentials SmtpCredentials { get; set; }
}