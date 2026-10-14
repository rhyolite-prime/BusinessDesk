using System;

namespace TopazERP.DomainServices.Ledger.Journals.Dto;

public class UpdateJournalDetailsDto
{
    public Guid JournalId { get; set; }
    public Guid Id { get; set; }
    public Guid AccountId { get; set; }
    public string AccountName { get; set; }
    public Guid OuId { get; set; } 
    public string OuName { get; set; }
    public string ReferenceNumber { get; set; }
    public string ChequeNo { get; set; }
    public string Description { get; set; }
    public DateTime TransactionDate { get; set; }
}