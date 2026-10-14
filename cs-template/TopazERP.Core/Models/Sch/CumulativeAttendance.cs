using System;

namespace TopazERP.Models.Sch;

public class CumulativeAttendance: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId { get; set; }
    public Guid ClassId { get; set; }
    public Guid TermId { get; set; }
    public Guid StudentId { get; set; }
    public int Days { get; set; }
    public int TenantId { get; set; }
    
}