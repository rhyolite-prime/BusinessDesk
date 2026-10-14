using System;

namespace TopazERP.Models.Sch;

public class ClassPromotion: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public DateTime StartDate { get; set; }
    public Guid FromClassId { get; set; }
    public string FromClassName { get; set; }
    public Guid ToClassId { get; set; }
    public string ToClassName { get; set; }
    public int TenantId { get; set; }
    
}