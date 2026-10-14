using System;

namespace TopazERP.Services.SchoolManager.PerformanceAreas.Dto;

public class CreateStudentPerformanceSkill
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public Guid ClassId { get; set; }
    public DateTime Date { get; set; }
    public Guid StudentId { get; set; }
    public Guid PerformanceSkillId { get; set; }
    public Guid PerformanceAreaId { get; set; }
}