using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.ActualLevels.Dto;

public class UpdateActualLevelInput:EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}