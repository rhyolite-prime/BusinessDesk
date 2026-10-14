using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.LevelsAndClasses.Dto;

public class UpdateLevelInput:EntityDto<Guid>
{
    public Guid ActualLevelId { get; set; }
    public string ActualLevelName { get; set; }
    public string LevelName { get; set; }
    public int Ordinal { get; set; }
    public bool AccessPerformanceForm { get; set; }
    public int TenantId { get; set; }
}