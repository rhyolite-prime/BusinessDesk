using System;

namespace TopazERP.Models.Sch;

public class AwardType: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string Name { get; set; }
    public int TenantId { get; set; }
    
}