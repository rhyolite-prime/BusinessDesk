using System;

namespace TopazERP.Models.Sch;

public class RemarksByTeacher: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public Guid ClassId { get; set; }
    public string TeacherType { get; set; }
    public string RemarkType { get; set; }
    public string Remark { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public string StudentIdentifier { get; set; }
    public int TenantId { get; set; }
}