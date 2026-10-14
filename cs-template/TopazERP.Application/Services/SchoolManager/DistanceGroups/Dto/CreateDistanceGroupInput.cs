using System;

namespace TopazERP.Services.SchoolManager.DistanceGroups.Dto;

public class CreateDistanceGroupInput
{
    public string Description { get; set; }
    public Guid DistanceUnitId { get; set; }
    public string DistanceUnitName { get; set; }
    public int DistanceFrom { get; set; }
    public int DistanceTo { get; set; }
    public decimal Amount { get; set; }
}