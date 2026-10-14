using System;

namespace TopazERP.Models.Sch;

public class Level: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid ActualLevelId { get; set; }
    public string ActualLevelName { get; set; }
    public string LevelName { get; set; }
    public int Ordinal { get; set; }
    public bool AccessPerformanceForm { get; set; }
    public int TenantId { get; set; }
}