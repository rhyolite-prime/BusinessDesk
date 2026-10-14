using System;

namespace TopazERP.Models.Sch;

public class ConductCutOf: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public decimal CutOfMark { get; set; }
    public int TenantId { get; set; }
}