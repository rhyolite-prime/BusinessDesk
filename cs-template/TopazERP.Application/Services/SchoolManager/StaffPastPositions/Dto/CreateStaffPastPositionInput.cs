using System;

namespace TopazERP.Services.SchoolManager.StaffPastPositions.Dto;

public class CreateStaffPastPositionInput
{
    public Guid DesignationId { get; set; }
    public string DesignationName { get; set; }
    public Guid StaffId { get; set; }
    public string StaffName { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}