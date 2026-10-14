using System;

namespace TopazERP.Models.Sch;

public class StudentPosition: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid PositionId { get; set; }
    public string PositionName { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public int TenantId { get; set; }
}