using System;

namespace TopazERP.Models.Sch;

public class StaffRelationship: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public int TenantId { get; set; }
    public Guid RelationShipId { get; set; }
    public string RelationShipName { get; set; }
    public string Name { get; set; }
    public string Address { get; set; }
    public string PhoneNumber { get; set; }
    public Guid StaffId { get; set; }
    public string StaffName { get; set; }
    public string FaxNumber { get; set; }
    public string Email { get; set; }
    public string MobileNumber { get; set; }
}