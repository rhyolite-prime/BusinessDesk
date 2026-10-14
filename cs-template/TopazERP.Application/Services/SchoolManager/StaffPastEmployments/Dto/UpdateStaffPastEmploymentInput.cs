using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.StaffPastEmployments.Dto;

public class UpdateStaffPastEmploymentInput : EntityDto<Guid>
{
    public Guid StaffId { get; set; }
    public string StaffName { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string CompanyName { get; set; }
    public string Reason { get; set; }
    public int TenantId { get; set; }
}