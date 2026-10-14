using System;

namespace TopazERP.Models.Sch;

public class TransportationUnit : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string UnitName { get; set; }
    public int TenantId { get; set; }
}