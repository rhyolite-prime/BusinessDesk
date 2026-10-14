using System;
using System.Collections.Generic;

namespace TopazERP.Models.Sch;

public class ClassLevelPercentage: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<ClassLevelPercentageDetail> Details { get; set; }
    
    public int TenantId { get; set; }
    
}