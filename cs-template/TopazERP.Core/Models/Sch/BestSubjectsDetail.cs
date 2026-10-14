using System;

namespace TopazERP.Models.Sch;

public class BestSubjectsDetail
{
    public Guid Id { get; set; }
    public Guid BestSubjectId { get; set; }
    public Guid SubjectId { get; set; }
    public string SubjectName { get; set; }
}