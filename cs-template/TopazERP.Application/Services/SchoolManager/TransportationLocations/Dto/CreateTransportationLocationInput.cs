using System;

namespace TopazERP.Services.SchoolManager.TransportationLocations.Dto;

public class CreateTransportationLocationInput
{
    public Guid LocationId { get; set; }
    public string LocationName { get; set; }
    public decimal Amount { get; set; }
    public Guid TransportationUnitId { get; set; }
    public string TransportationUnitName { get; set; }
}