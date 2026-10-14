using System;

namespace TopazERP.Services.SchoolManager.ClassAttendances.Dto;

public class CreateCumulativeAttendanceInput
{
    public Guid AcademicYearId { get; set; }
    public Guid ClassId { get; set; }
    public Guid TermId { get; set; }
    public Guid StudentId { get; set; }
    public int Days { get; set; }
   
}