using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.TransportationUnits.Dto;

public class UpdateTransportationUnitInput : EntityDto<Guid>
{
    public string UnitName { get; set; }
    public int TenantId { get; set; }
}