using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.Shared.PersonnelStatus.Dto;

public class UpdatePersonnelStatusInput: EntityDto<Guid>
{
    public string Name { get; set; }
    public bool IsDefault { get; set; }
    public int TenantId { get; set; }
}