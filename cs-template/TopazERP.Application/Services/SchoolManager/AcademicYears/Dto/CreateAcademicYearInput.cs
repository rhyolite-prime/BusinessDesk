using System;

namespace TopazERP.Services.SchoolManager.AcademicYears.Dto;

public class CreateAcademicYearInput
{
    public string Name { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; }
}