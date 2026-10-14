using System;

namespace TopazERP.Models.Sch;

public class AcademicYearTermDetail: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearTermId { get; set; }
    public string AcademicYearTermName { get; set; }
    public string ActivityDescription { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TenantId { get; set; }
}