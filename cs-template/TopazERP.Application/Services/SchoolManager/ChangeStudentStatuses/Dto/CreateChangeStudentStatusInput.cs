using System;

namespace TopazERP.Services.SchoolManager.ChangeStudentStatuses.Dto;

public class CreateChangeStudentStatusInput
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public string StudentIdentifier { get; set; }
    public string Reason { get; set; }
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid StatusId { get; set; }
    public string StatusName { get; set; }
    public DateTime ChangeDate { get; set; }
}