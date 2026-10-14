using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.PtaPositions.Dto;

public class UpdatePtaPositionInput : EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}