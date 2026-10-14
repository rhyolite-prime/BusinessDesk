using System;

namespace TopazERP.Models.Sch;

public class TransportationLocation : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid LocationId { get; set; }
    public string LocationName { get; set; }
    public decimal Amount { get; set; }
    public Guid TransportationUnitId { get; set; }
    public string TransportationUnitName { get; set; }
    public int TenantId { get; set; }
    
}