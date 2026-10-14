using System;

namespace TopazERP.Models.Sch;

public class SupplementaryItem: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string Name { get; set; }
    public bool IsFixed { get; set; }
    public int TenantId { get; set; }
}