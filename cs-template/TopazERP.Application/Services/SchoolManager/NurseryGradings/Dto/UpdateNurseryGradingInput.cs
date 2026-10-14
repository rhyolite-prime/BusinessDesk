using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.NurseryGradings.Dto;

public class UpdateNurseryGradingInput : EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}