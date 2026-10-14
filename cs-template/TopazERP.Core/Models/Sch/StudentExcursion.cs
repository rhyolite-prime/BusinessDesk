using System;

namespace TopazERP.Models.Sch;

public class StudentExcursion
{
    public Guid Id { get; set; }
    public Guid ExcursionId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentIdentifier { get; set; }
    public string StudentName { get; set; }
    public bool IsPresent { get; set; }
}