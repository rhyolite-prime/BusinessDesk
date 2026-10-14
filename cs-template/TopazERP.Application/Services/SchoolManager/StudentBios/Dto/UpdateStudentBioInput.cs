using System;
using Abp.Application.Services.Dto;
using Abp.Events.Bus.Entities;

namespace TopazERP.Services.SchoolManager.StudentBios.Dto;

public class UpdateStudentBioInput:EntityDto<Guid>
{
    public string StudentIdentifier { get; set; }
    public string FirstName { get; set; }
    public string OtherName { get; set; }
    public string LastName { get; set; }
    public DateTime DateOfBirth { get; set; }
    public string Gender { get; set; }
    public Guid CountryId { get; set; }
    public string CountryName { get; set; }
    public string Nationality { get; set; }
    public Guid CityId { get; set; }
    public string CityName { get; set; }
    public string HouseNumber { get; set; }
    public Guid LocationId { get; set; }
    public string LocationName { get; set; }
    public Guid ReligionId { get; set; }
    public string ReligionName { get; set; }
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public string ContactNumber { get; set; }
    public string Address { get; set; }
    public string PhoneNumber { get; set; }
    public DateTime AdmissionDate { get; set; }
    public bool IsBoarder { get; set; }
    public bool IsParentControl { get; set; }
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public string Notes { get; set; }
    public Guid StatusId { get; set; }
    public string StatusName { get; set; }
    public decimal BalanceDue { get; set; }
    public DateTime BalanceDueDate { get; set; }
    public bool IsPreClassStudent { get; set; }
    public Guid HostelId { get; set; }
    public string HostelName { get; set; }
    public string HostelBlockName { get; set; }
    public Guid HouseId { get; set; }
    public string HouseName { get; set; }
    public string IndexNumber { get; set; }
    public bool isAlumni { get; set; }
    public string BillAs { get; set; }
    public int TenantId { get; set; } 
}