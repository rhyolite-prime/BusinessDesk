using System;

namespace TopazERP.Models.Sch;

public class PerformanceSkill : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid PerformanceAreaId { get; set; }
    public string PerformanceAreaName { get; set; }
    public string Name { get; set; }
    public int TenantId { get; set; }
    
}