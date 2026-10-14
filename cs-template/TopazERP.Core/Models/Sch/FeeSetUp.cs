using System;
using System.Collections.Generic;

namespace TopazERP.Models.Sch;

public class FeeSetUp: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public Guid ClassId { get; set; }
    public Guid LevelId { get; set; }
    public bool IsClassFee { get; set; }
    public bool IsLevelFee { get; set; }
    public bool IsSchoolFee { get; set; }
    public string FeeType { get; set; }
    public int TenantId { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<FeeSetUpDetail> Details { get; set; }
}