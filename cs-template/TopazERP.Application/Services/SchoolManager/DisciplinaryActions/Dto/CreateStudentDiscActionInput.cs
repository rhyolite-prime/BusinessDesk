using System;

namespace TopazERP.Services.SchoolManager.DisciplinaryActions.Dto;

public class CreateStudentDiscActionInput
{
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public Guid OffenseId { get; set; }
    public string OffenseName { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public string Description { get; set; }
    public DateTime ActionDate { get; set; }
}