using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.Locations.Dto;

public class UpdateLocationInput : EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}