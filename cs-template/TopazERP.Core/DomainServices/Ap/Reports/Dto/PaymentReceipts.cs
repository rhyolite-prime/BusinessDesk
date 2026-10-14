using Microsoft.VisualBasic;

namespace TopazERP.DomainServices.Ap.Reports.Dto;

public class PaymentReceipts
{
    public string SupplierName { get; set; }
    public string InvoiceNumber { get; set; }
    public string InvoiceDate { get; set; }
    public decimal TotalInvoiceAmount { get; set; }
    public decimal AmountToPay { get; set; }
    public string BatchNumber { get; set; }
    public decimal Rate { get; set; }
    
    public string PaymentDate { get; set; }
    public string AmountInWords { get; set; }
    public string ModeOfPayment { get; set; }
    public string ChequeNo { get; set; }
    public string CurrencyName { get; set; }
    public string CurrencyCode { get; set; }
    public decimal PayRate { get; set; }
    public string InvoiceType {get;set;}
    public string ReceiptNo { get; set; }
    public string BankName { get; set; }
    public string BankBranch { get; set; }
    public string Description { get; set; }
    public string CreditGl { get; set; }
    public string DebitGl { get; set; }
    public object OutstandingCreditMemo { get; set; }
    public decimal AmountToApply { get; set; }
}