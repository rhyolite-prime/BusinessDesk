using System;
using System.Collections.Generic;

namespace TopazERP.Models.Sch;

public class PrizeAwarded: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid TermId { get; set; }
    public string TermName { get; set; }
    public Guid LevelId { get; set; }
    public string LevelName { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<PrizeAwardDetail> Details { get; set; }
    public int TenantId { get; set; }
    
}