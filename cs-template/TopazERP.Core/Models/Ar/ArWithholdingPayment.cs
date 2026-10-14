using System;
using System.Collections.Generic;

namespace TopazERP.Models.Ar;

public class ArWithholdingPayment: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; }
    public string AccountNumber { get; set; }
    public decimal AmountToPay { get; set; }
    public decimal AmountToApply { get; set; }
    public DateTime PaymentDate { get; set; }
    public decimal OutstandingCreditMemo { get; set; }
    public Guid CurrencyId { get; set; }
    public string CurrencyName { get; set; }
    public string CurrencyCode { get; set; }
    public string ModeOfPayment { get; set; }
    public string ChequeNumber { get; set; }
    public decimal BuyRate { get; set; }
    public decimal SellRate { get; set; }
    public Guid BankAccountId { get; set; }
    public string BankAccountName { get; set; }
    public string BankAccountNumber { get; set; }
    public bool IsAutomatic { get; set; }
    public bool IsPosted { get; set; }
    public string BatchNumber { get; set; }
    public int TenantId { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<ArInvoice> InvoiceList { get; set; }
    
}

public class PostArWithHoldingPaymentDto
{
    public List<Guid> WithHoldingIds { get; set; }
}
