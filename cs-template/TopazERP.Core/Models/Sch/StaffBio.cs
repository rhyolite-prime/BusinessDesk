using System;

namespace TopazERP.Models.Sch;

public class StaffBio: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string StaffIdentifier { get; set; }
    public string FirstName { get; set; }
    public string OtherName { get; set; }
    public string LastName { get; set; }
    public DateTime DateOfBirth { get; set; }
    public string Gender { get; set; }
    public string ContactNumber { get; set; }
    public string Email { get; set; }
    public string Address { get; set; }
    public string FaxNumber { get; set; }
    public Guid TitleId { get; set; }
    public string TitleName { get; set; }
    public Guid DesignationId { get; set; }
    public string DesignationName { get; set; }
    public string SocialSecurityNumber { get; set; }
    public Guid GradeId { get; set; }
    public string GradeName { get; set; }
    public DateTime DateOfEmployment { get; set; }
    public DateTime DateAppointed { get; set; }
    public bool IsTeacher { get; set; }
    public DateTime DatePromotedToGrade { get; set; }
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public string Notes { get; set; }
    
    /*next of kin details*/
    public string NextOfKinName { get; set; }
    public string NextOfKinContactNumber { get; set; }
    public string NextOfKinEmail { get; set; }
    public string NextOfKinAddress { get; set; }
    public Guid NextOfKinRelationshipId { get; set; }
    public int TenantId { get; set; }
}