using System;
using System.Collections.Generic;

namespace TopazERP.Models.Sch;

public class Assessment
{
    public Guid Id { get; set; }
    public Guid MidTermAssessmentId {get; set;}
    public Guid StudentId {get; set;}
    public string StudentName {get; set;}
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<AssessmentRemarkHeader> Headers { get; set; }
}