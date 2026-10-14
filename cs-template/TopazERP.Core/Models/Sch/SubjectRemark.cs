using System;

namespace TopazERP.Models.Sch;

public class SubjectRemark: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string Stage { get; set; }
    public string GradeNumber { get; set; }
    public decimal MinMark { get; set; }
    public decimal MaxMark { get; set; }
    public string Remark { get; set; }
    public int TenantId { get; set; }
    
}