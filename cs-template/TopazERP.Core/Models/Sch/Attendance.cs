using System;

namespace TopazERP.Models.Sch;

public class Attendance: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public DateTime Date { get; set; }
    public Guid StudentId { get; set; }
    public string StudentIdentifier { get; set; }
    public string StudentName { get; set; }
    public bool IsPresent { get; set; }
    public int TenantId { get; set; }
    
}