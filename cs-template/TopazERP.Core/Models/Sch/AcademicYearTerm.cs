using System;

namespace TopazERP.Models.Sch;

public class AcademicYearTerm: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid TermId { get; set; }
    public string TermName { get; set; }
    public int Ordinal { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public Guid ActualLevelId { get; set; }
    public string ActualLevelName { get; set; }
    public int TenantId { get; set; }
    
}