using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.OpeningBalances.Dto;

public class UpdateStudentOpeningBalanceInput:EntityDto<Guid>
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