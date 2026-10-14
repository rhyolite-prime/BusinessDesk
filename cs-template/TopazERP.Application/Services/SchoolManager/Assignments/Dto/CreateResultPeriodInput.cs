using System;

namespace TopazERP.Services.SchoolManager.Assignments.Dto;

public class CreateResultPeriodInput
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}