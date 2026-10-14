using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.PerformanceAreas.Dto;

public class UpdatePerformanceSkillInput : EntityDto<Guid>
{
    public Guid PerformanceAreaId { get; set; }
    public string Name { get; set; }
    public int TenantId { get; set; }
}