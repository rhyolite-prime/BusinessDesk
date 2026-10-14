using System;

namespace TopazERP.Models.Sch;

public class DistanceGroup : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string Description { get; set; }
    public Guid DistanceUnitId { get; set; }
    public string DistanceUnitName { get; set; }
    public int DistanceFrom { get; set; }
    public int DistanceTo { get; set; }
    public decimal Amount { get; set; }
    public int TenantId { get; set; }
}