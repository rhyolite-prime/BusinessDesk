using System;
using System.Collections.Generic;

namespace TopazERP.Models.Ap;

public class ApInvoicePaymentRecords: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>
{
   public Guid PaymentId { get; set; }
   public Guid InvoiceId { get; set; }
   public string InvoiceNo { get; set; }
   public string SupplierName { get; set; }
   public decimal Amount { get; set; }
   public decimal WithheldAmount { get; set; }
   public decimal ConvertedWithheldAmount { get; set; }
   public decimal ConvertedAmount { get; set; }
   public DateTime PaymentDate { get; set; }
   public string BankName { get; set; }
   public string BankBranch { get; set; }
   public string CurrencyName { get; set; }
   public string CurrencyCode { get; set; }
   public string ModeOfPayment { get; set; }
   public string ChequeNo { get; set; }
   public bool IsPosted { get; set; }
   public string ReceiptNo { get; set; }
}