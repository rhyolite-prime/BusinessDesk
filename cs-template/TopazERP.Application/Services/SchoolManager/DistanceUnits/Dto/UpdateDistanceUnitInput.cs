using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.DistanceUnits.Dto;

public class UpdateDistanceUnitInput:EntityDto<Guid>
{
    public string UnitName { get; set; }
    public int TenantId { get; set; }
    
}