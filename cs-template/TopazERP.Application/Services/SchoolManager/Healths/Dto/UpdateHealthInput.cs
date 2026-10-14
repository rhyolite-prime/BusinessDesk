using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.Healths.Dto;

public class UpdateHealthInput:EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}