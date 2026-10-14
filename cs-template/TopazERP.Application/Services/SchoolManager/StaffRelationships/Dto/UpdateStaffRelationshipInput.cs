using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.StaffRelationships.Dto;

public class UpdateStaffRelationshipInput : EntityDto<Guid>
{
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
    public int TenantId { get; set; }
}