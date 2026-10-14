using System;

namespace TopazERP.Models.Sch;

public class BehavioralAssessmentImport
{
    public Guid Id { get; set; }
    public string BehavioralAssessmentId { get; set; }
    public Guid StudentId {get; set;}
    public string StudentName { get; set; }
    public string StudentIdentifier {get; set;}
    public string Description { get; set; }
}