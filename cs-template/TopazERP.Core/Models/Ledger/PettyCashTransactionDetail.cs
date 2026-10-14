using System;

namespace TopazERP.Models.Ledger;

public class PettyCashTransactionDetail
{
    public Guid Id { get; set; }
    public DateTime TransactionDate { get; set; }
    public string RefNo { get; set; }
    
    public Guid ExpenseAccountId { get; set; }
    public string ExpenseAccountName { get; set; }
    
    public string Description { get; set; }
    public decimal Amount { get; set; }
    
    public Guid? OuId { get; set; }
    public string OuName { get; set; }
    
    public Guid? RecipientId { get; set; }
    public string RecipientName { get; set; }
}
