using System;

namespace TopazERP.Models.Sch;

public class TeacherExcursion
{
    public Guid Id { get; set; }
    public Guid ExcursionId { get; set; }
    public Guid TeacherId { get; set; }
    public string TeacherName { get; set; }
}