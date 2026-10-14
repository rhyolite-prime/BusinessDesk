using System;
using System.Collections.Generic;

namespace TopazERP.Models.Sch;

public class PreClassStudentPromotion: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId { get; set; }
    public Guid FromClassId { get; set; }
    public Guid ToClassId { get; set; }
    public bool IsIndividualClass { get; set; }
    public bool IsEntireLevel { get; set; }
    public bool IsAlumni { get; set; }
    public Guid EntireLevelClassId { get; set; }
    public int TenantId { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<PromotedStudents> Students { get; set; }
}