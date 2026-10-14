using System;
using System.Collections.Generic;

namespace TopazERP.Models.Sch;

public class Bill: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public Guid ClassId { get; set; }
    public Guid LevelId { get; set; }
    public string BillNumber { get; set; }
    public DateTime BillDate { get; set; }
    public int BillingScopeId { get; set; }
    public bool IsProcessed { get; set; }
    public bool IsPosted { get; set; }
    public bool IsCancelled { get; set; }
    public string CanceledBy { get; set; }
    public DateTime? CanceledDate { get; set; }
    public int BillTypeId { get; set; }
    public string BatchNumber { get; set; }
    public Guid JournalId { get; set; }
    public int TenantId { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<BillDetail> Details { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<BilledStudent> Students { get; set; }
}