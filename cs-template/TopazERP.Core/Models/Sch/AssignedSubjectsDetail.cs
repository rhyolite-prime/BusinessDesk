using System;

namespace TopazERP.Models.Sch;

public class AssignedSubjectsDetail
{
    public Guid Id { get; set; }
    public Guid AssignedSubjectId { get; set; }
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; }
}