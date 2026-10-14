using System;

namespace TopazERP.Models.Sch;

public class StContactRelationship: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid legalGuardiaanId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public Guid RelationshipId { get; set; }
    public string RelationshipName { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string OtherNames { get; set; }
    public string PhoneNumber { get; set; }
    public string ContactNumber { get; set; }
    public string Email { get; set; }
    public Guid TitleId { get; set; }
    public string TitleName { get; set; }
    public bool IsLegalGuardian { get; set; }
    public string PlaceOfWork { get; set; }
    public string WorkPhone { get; set; }
    public int TenantId { get; set; }
    
}