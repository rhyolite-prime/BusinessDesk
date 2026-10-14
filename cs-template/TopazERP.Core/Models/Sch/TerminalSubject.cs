using System;

namespace TopazERP.Models.Sch;

public class TerminalSubject: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string Name { get; set; }
    public int Mark { get; set; }
    public int TenantId { get; set; }
    
}