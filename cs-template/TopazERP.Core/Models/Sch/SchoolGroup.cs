using System;

namespace TopazERP.Models.Sch;

public class SchoolGroup: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string Name { get; set; }
    public Guid StaffId { get; set; }
    public string StaffName { get; set; }
    public int TenantId { get; set; }
    
}