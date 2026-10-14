using System;

namespace TopazERP.Services.SchoolManager.AcademicYears.Dto;

public class CreateAcademicYearTermDetailInput
{
    public Guid AcademicYearTermId { get; set; }
    public string AcademicYearTermName { get; set; }
    public string ActivityDescription { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}