using System;

namespace TopazERP.Models.Sch;

public class TeacherSubject: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public int TenantId { get; set; }
    public Guid StaffId { get; set; }
    public string StaffName { get; set; }
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; }
}