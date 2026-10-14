using System;

namespace TopazERP.Models.Sch;

public class RepeatedStudent: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId { get; set; }
    public Guid RepeatClassId { get; set; }
    public Guid StudentId { get; set; }
    public int TenantId { get; set; }
    
}