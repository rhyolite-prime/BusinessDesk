using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.StudentPositions.Dto;

public class UpdatePositionInput: EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}