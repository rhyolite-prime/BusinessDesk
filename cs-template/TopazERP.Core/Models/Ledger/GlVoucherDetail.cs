using System;

namespace TopazERP.Models.Ledger;

public class GlVoucherDetail
{
    public Guid Id { get; set; }
    public Guid DebitAccountId { get; set; }
    public string DebitAccountName { get; set; }
    public bool WithHold { get; set; }
    public Guid OuId { get; set; }
    public string OuName { get; set; }
    public decimal Amount { get; set; } // debit amount
    public decimal ForeignDebitAmount { get; set; } // debit amount
    public string ReferenceNo { get; set; }
    public string Description { get; set; }
    public string InvoiceNo { get; set; }
    public bool HasImprest { get; set; }
}