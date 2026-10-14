using System;

namespace TopazERP.Models.Sch;

public class StaffPastPosition: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public int TenantId { get; set; }
    public Guid DesignationId { get; set; }
    public string DesignationName { get; set; }
    public Guid StaffId { get; set; }
    public string StaffName { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}