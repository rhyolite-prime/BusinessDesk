using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.TransportationLocations.Dto;

public class UpdateTransportationLocationInput : EntityDto<Guid>
{
    public Guid LocationId { get; set; }
    public string LocationName { get; set; }
    public decimal Amount { get; set; }
    public Guid TransportationUnitId { get; set; }
    public string TransportationUnitName { get; set; }
    public int TenantId { get; set; }
}