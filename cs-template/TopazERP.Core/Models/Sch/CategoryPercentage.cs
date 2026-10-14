using System;

namespace TopazERP.Models.Sch;

public class CategoryPercentage: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public decimal ExamPercentage { get; set; }
    public decimal Cat1Percentage { get; set; }
    public decimal Cat2Percentage { get; set; }
    public decimal Cat3Percentage { get; set; }
    public decimal Cat4Percentage { get; set; }
    
    public int TenantId { get; set; }
    
}