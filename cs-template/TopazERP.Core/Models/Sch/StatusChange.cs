using System;

namespace TopazERP.Models.Sch;

public class StatusChange: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public string StudentIdentifier { get; set; }
    public string Reason { get; set; }
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid StatusId { get; set; }
    public string StatusName { get; set; }
    public DateTime ChangeDate { get; set; }
    public int TenantId { get; set; }
    
}