using System;

namespace TopazERP.DomainServices.Ledger.Reports.Dto;

public class GlReportDto
{
    
}

public class BalanceSheetDto
{
    public DateTime? EndDate { get; set; }
    public bool IncludeUnpostedTransaction { get; set; }
    public bool IncludeAllAccounts { get; set; }
    public bool IsDetailed { get; set; }
    public Guid OuId { get; set; }
    public bool Revalue { get; set; }
    public bool IncludeGlTransactions { get; set; }
    public bool IncludeArTransactions { get; set; }
    public bool IncludeApTransactions { get; set; }
}

public class GlTransactionReportDto
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public Guid AccountId { get; set; }
    public string AccountName { get; set; }
    public Guid OuId { get; set; }
    public string BatchNo { get; set; }
    
    public string JournalEntryType { get; set; }
    public string ReportType { get; set; }
    
    public string ReportTitle { get; set; }
    
}


//response Dto

public class TransactionReportItem
{
    public string BatchNo { get; set; }
    public string BatchNumber { get; set; }
    public string OrganizationalUnit { get; set; }
    public string Date { get; set; }
    public string Description { get; set; }
    public string OuName { get; set; }
    public string Source { get; set; }
    public string RefNo { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal Deposit { get; set; }
    
    public decimal Withdrawal { get; set; }
    
    public decimal EndingBalance { get; set; }
    public Guid AccountId { get; set; }
    public string AccountName { get; set; }
    public string Year { get; set; }
    public string Month { get; set; }
    public int MonthIndex { get; set; }
    public string CreatedAt { get; set; }
    
    public string ChequeNo { get; set; }
    
    
}
