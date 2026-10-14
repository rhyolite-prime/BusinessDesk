using System;

namespace TopazERP.Services.SchoolManager.SchoolGroups.Dto;

public class CreateSchoolGroupInput
{
    public string Name { get; set; }
    public Guid StaffId { get; set; }
    public string StaffName { get; set; }
}