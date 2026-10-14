using System;

namespace TopazERP.Models.Sch;

public class StudentDisciplinaryAction: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public Guid OffenseId { get; set; }
    public string OffenseName { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public string Description { get; set; }
    public DateTime ActionDate { get; set; }
    public int TenantId { get; set; }
    
}