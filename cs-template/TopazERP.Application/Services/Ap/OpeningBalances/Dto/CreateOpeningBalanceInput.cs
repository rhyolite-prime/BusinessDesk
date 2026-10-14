using System;
using System.Collections.Generic;

namespace TopazERP.Services.Ap.OpeningBalances.Dto;

public class CreateOpeningBalanceInput
{
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; }
    public string AccountNumber { get; set; }
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }
    public Guid CurrencyId { get; set; }
    public string CurrencyName { get; set; }
    public string CurrencyCode { get; set; }
    public decimal BuyRate { get; set; }
    public decimal SellRate { get; set; }
    public Guid OuId { get; set; }
    public string OuName { get; set; }
 // public Guid BankAccountId { get; set; }
 //   public string BankAccountName { get; set; }
    public bool IsPosted { get; set; }
}
