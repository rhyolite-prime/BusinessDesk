using System;

namespace TopazERP.Models.Sch;

public class StudentAllergy: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AllergyTypeId { get; set; }
    public string AllergyTypeName { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public int TenantId { get; set; }
}