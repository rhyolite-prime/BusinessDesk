using System;

namespace TopazERP.Models.Sch;

public class StudentOpeningBalance: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId {get; set;}
    public string AcademicYearName {get; set;}
    public Guid ClassId {get; set;}
    public string ClassName {get; set;}
    public string StudentIdentifier {get; set;}
    public Guid StudentId {get; set;}
    public string StudentName {get; set;}
    public decimal Amount {get; set;}
    public Guid CurrencyId {get; set;}
    public decimal Rate {get; set;}
    public DateTime Date {get; set;}
    public bool IsPosted {get; set;}
    public int TenantId {get; set;}
}