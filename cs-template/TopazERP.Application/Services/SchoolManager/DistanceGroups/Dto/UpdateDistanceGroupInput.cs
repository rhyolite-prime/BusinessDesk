using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.DistanceGroups.Dto;

public class UpdateDistanceGroupInput : EntityDto<Guid>
{
    public string Description { get; set; }
    public Guid DistanceUnitId { get; set; }
    public string DistanceUnitName { get; set; }
    public int DistanceFrom { get; set; }
    public int DistanceTo { get; set; }
    public decimal Amount { get; set; }
    public int TenantId { get; set; }
}