using System;

namespace TopazERP.Models.Sch;

public class StudentImmunization: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public Guid ImmunizationTypeId { get; set; }
    public string ImmunizationTypeName { get; set; }
    public bool IsImmunized { get; set; }
    public DateTime ImmunizationDate { get; set; }
    public int TenantId { get; set; }
    
}