using System;

namespace TopazERP.Models.Shared;

//taxlevies
public class TaxLevy : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string Name { get; set; }
    public decimal Rate { get; set; } 
    public string Type { get; set; } //vat, others
    public int TenantId { get; set; }

}