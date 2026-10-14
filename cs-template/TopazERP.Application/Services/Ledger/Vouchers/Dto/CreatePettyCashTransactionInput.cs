using System;
using System.Collections.Generic;
using Abp.Application.Services.Dto;
using TopazERP.Models.Ledger;

namespace TopazERP.Services.Ledger.Vouchers.Dto;

public class CreatePettyCashTransactionInput
{
    public DateTime BatchDate { get; set; }
    public string BatchNo { get; set; }
    public string SourceDocNo { get; set; }
    
    public Guid PettyCashAccountId { get; set; }
    public string PettyCashAccountName { get; set; }
    
    public string BatchOriginator { get; set; }
    
    public Guid CurrencyId { get; set; }
    public string CurrencyName { get; set; }
    public string CurrencyCode { get; set; }
    public decimal CurrencyRate { get; set; }
    
    public decimal TotalAmount { get; set; }
    
    public List<PettyCashTransactionDetail> Details { get; set; }
    public List<Guid> ProposedJournalDetailIdList { get; set; }
    public Guid ProposedJournalHeaderId { get; set; }
}

public class UpdatePettyCashTransactionInput : EntityDto<Guid>
{
    public DateTime BatchDate { get; set; }
    public string BatchNo { get; set; }
    public string SourceDocNo { get; set; }
    
    public Guid PettyCashAccountId { get; set; }
    public string PettyCashAccountName { get; set; }
    
    public string BatchOriginator { get; set; }
    
    public Guid CurrencyId { get; set; }
    public string CurrencyName { get; set; }
    public string CurrencyCode { get; set; }
    public decimal CurrencyRate { get; set; }
    
    public decimal TotalAmount { get; set; }
    
    public List<PettyCashTransactionDetail> Details { get; set; }
    public List<Guid> ProposedJournalDetailIdList { get; set; }
    public Guid ProposedJournalHeaderId { get; set; }
}
