using System;
namespace TopazERP.Models.Shared;

public class Status: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}