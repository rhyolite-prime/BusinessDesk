using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.PerformanceAreas.Dto;

public class UpdatePerformanceAreaInput : EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}