using System;

namespace TopazERP.Models.Sch;

public class SchoolGroupPosition: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string Name { get; set; }
    public Guid SchoolGroupId { get; set; }
    public string SchoolGroupName { get; set; }
    public int TenantId { get; set; }
    
}