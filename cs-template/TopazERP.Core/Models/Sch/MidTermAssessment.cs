using System;
using System.Collections.Generic;

namespace TopazERP.Models.Sch;

public class MidTermAssessment: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public Guid AcademicYearId {get; set;}
    public string AcademicYearName { get; set; }
    public Guid TermId { get; set; }
    public string TermName { get; set; }
    public int TenantId { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<Assessment> Assessment { get; set; }
}