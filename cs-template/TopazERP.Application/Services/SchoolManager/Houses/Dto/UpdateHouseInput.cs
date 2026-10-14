using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.Houses.Dto;

public class UpdateHouseInput:EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}