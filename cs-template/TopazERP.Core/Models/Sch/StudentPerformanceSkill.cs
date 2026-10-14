using System;

namespace TopazERP.Models.Sch;

public class StudentPerformanceSkill: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public Guid ClassId { get; set; }
    public DateTime Date { get; set; }
    public Guid StudentId { get; set; }
    public Guid PerformanceSkillId { get; set; }
    public Guid PerformanceAreaId { get; set; }
    public int TenantId { get; set; }
    
}