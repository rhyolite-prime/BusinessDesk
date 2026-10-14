using System;
using System.ComponentModel.DataAnnotations;

namespace TopazERP.Models.Ledger;

public class DeletedJournal: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    [MaxLength(20)]
    public string BatchNumber { get; set; }
    [MaxLength(100)]
    public string BatchDescription { get; set; }
    public Guid AccountId { get; set; }
    [MaxLength(100)]
    public string AccountName { get; set; }
    public DateTime BatchDate { get; set; }
    public decimal DebitAmount { get; set; }
    public decimal CreditAmount { get; set; }
    [MaxLength(100)]
    public string DeletedBy { get; set; }
    public int TenantId { get; set; }
    
}