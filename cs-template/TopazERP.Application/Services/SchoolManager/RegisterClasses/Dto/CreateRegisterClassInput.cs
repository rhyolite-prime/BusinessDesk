using System;

namespace TopazERP.Services.SchoolManager.RegisterClasses.Dto;

public class CreateRegisterClassInput
{
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public string Description { get; set; }
    public int Capacity { get; set; }
    public Guid RoomId { get; set; }
    public string RoomName { get; set; }
    public Guid MainTeacherId { get; set; }
    public string MainTeacherName { get; set; }
    public Guid SubTeacherId { get; set; }
    public string SubTeacherName { get; set; }
    public Guid ClassPrefectId { get; set; }
    public string ClassPrefectName { get; set; }
    public Guid AssistantPrefectId { get; set; }
    public string AssistantPrefectName { get; set; }
    public string Comments { get; set; }
}