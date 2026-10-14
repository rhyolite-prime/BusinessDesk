using System;

namespace TopazERP.Models.Sch;

public class DisciplinaryAction : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string ActionDescription { get; set; }
    public int TenantId { get; set; }
}