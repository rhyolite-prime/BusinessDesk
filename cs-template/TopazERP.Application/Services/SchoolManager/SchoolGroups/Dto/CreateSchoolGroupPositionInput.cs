using System;

namespace TopazERP.Services.SchoolManager.SchoolGroups.Dto;

public class CreateSchoolGroupPositionInput
{
    public string Name { get; set; }
    public Guid SchoolGroupId { get; set; }
    public string SchoolGroupName { get; set; }
    
}