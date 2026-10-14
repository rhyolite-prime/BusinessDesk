using System;

namespace TopazERP.Models.Sch;

public class StaffPastEmployment: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public int TenantId { get; set; }
    public Guid StaffId { get; set; }
    public string StaffName { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string CompanyName { get; set; }
    public string Reason { get; set; }
}
