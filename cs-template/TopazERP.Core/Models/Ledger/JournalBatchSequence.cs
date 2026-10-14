using System;
using System.ComponentModel.DataAnnotations;
using Abp.Domain.Entities.Auditing;

namespace TopazERP.Models.Ledger;

public class JournalBatchSequence : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    [MaxLength(10)]
    public string Prefix { get; set; }
    [MaxLength(10)]
    public string Suffix { get; set; }
    public int CurrentBatchNumber { get; set; }
    public int NextBatchNumber { get; set; }
    public int SequenceIncrement { get; set; }
    public int TenantId { get; set; }
}