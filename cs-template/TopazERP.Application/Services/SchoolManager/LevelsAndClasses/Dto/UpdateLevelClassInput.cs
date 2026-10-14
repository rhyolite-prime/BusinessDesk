using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.LevelsAndClasses.Dto;

public class UpdateLevelClassInput:EntityDto<Guid>
{
    public Guid LevelId { get; set; }
    public string LevelName { get; set; }
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public bool IsHighestClass { get; set; }
    public Guid StreamId { get; set; }
    public string StreamName { get; set; }
    public int Ordinal { get; set; }
    public int TenantId { get; set; }
}