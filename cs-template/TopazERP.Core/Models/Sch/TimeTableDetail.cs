using System;

namespace TopazERP.Models.Sch;

public class TimeTableDetail
{
    public Guid Id { get; set; }
    public Guid TimeTableId { get; set; }
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; }
    public Guid TeacherId { get; set; }
    public string TeacherName { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
}