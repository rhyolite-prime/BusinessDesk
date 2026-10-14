using System;
using System.Collections.Generic;

namespace TopazERP.Models.Ap;

public class ApPaymentHist: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; }
    public string AccountNumber { get; set; }
    public Guid OuId { get; set; }
    public string OuName { get; set; }
    public string BatchNumber { get; set; }
    public string ReferenceNumber { get; set; }
    public decimal AmountToPay { get; set; }
    public DateTime PaymentDate { get; set; }
    public decimal OutstandingCreditMemo { get; set; }
    public Guid InvoiceTypeId { get; set; }
    public string InvoiceTypeName { get; set; }
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
    public int TenantId { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<ApInvoice> InvoiceList { get; set; }
}

public class PostPaymentDto
{
    public List<Guid> PaymentIds { get; set; }
}