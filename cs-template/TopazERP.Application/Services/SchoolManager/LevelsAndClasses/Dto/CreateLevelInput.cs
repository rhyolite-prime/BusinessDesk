using System;

namespace TopazERP.Services.SchoolManager.LevelsAndClasses.Dto;

public class CreateLevelInput
{
    public Guid ActualLevelId { get; set; }
    public string ActualLevelName { get; set; }
    public string LevelName { get; set; }
    public int Ordinal { get; set; }
    public bool AccessPerformanceForm { get; set; }
}