using System;

namespace TopazERP.Models.Sch;

public class PtaExecutive: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid PtaPositionId { get; set; }
    public string PtaPositionName { get; set; }
    public string Name { get; set; }
    public string PhoneNumber { get; set; }
    public string Email { get; set; }
    public string Address { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TenantId { get; set; }
    
}