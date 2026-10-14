using System;

namespace TopazERP.Models.Sch;

public class Subject: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string Name { get; set; }
    public string Abbreviation { get; set; }
    public bool IsCore { get; set; }
    public bool IsBestSubject { get; set; }
    public int TenantId { get; set; }
}