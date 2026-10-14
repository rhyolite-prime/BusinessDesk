using System;

namespace TopazERP.Models.Sch;

public class StudentDisability: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid DisabilityId { get; set; }
    public string DisabilityName { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public int TenantId { get; set; }
}