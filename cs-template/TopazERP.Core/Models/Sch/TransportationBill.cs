using System;
using System.Collections.Generic;

namespace TopazERP.Models.Sch;

public class TransportationBill: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public Guid ClassId { get; set; }
    public Guid LevelId { get; set; }
    public bool IsProcessed { get; set; }
    public bool IsCancelled { get; set; }
    public string BillNumber { get; set; }
    public int TenantId { get; set; }
    public DateTime BillDate { get; set; }
    public bool IsPosted { get; set; }
    public string CanceledBy { get; set; }
    public DateTime? CanceledDate { get; set; }
    public string BatchNumber { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<TransportationBillDetails> Details { get; set; }
}