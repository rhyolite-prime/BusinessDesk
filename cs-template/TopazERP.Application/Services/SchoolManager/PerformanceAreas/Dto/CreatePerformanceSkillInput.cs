using System;

namespace TopazERP.Services.SchoolManager.PerformanceAreas.Dto;

public class CreatePerformanceSkillInput
{
    public Guid PerformanceAreaId { get; set; }
    public string Name { get; set; }
}