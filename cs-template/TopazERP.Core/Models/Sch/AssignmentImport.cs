using System;

namespace TopazERP.Models.Sch;

public class AssignmentImport
{
    public Guid Id { get; set; }
    public Guid ClassAssignmentId {get; set;}
    public string StudentIdentifier {get; set;}
    public string StudentName { get; set; }
    public decimal Marks {get; set;}
}