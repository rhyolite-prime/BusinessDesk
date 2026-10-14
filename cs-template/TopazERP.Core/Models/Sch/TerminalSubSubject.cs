using System;

namespace TopazERP.Models.Sch;

public class TerminalSubSubject: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid TerminalSubjectId { get; set; }
    public string TerminalSubjectName { get; set; }
    public string Name { get; set; }
    public int Mark { get; set; }
    public int TenantId { get; set; }
}