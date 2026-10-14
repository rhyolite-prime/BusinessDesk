using System;

namespace TopazERP.Services.SchoolManager.StaffPastEmployments.Dto;

public class CreateStaffPastEmploymentInput
{
    public Guid StaffId { get; set; }
    public string StaffName { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string CompanyName { get; set; }
    public string Reason { get; set; }
}