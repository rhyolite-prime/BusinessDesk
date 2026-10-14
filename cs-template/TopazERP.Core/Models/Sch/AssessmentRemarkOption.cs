using System;

namespace TopazERP.Models.Sch;

public class AssessmentRemarkOption
{
    public Guid Id { get; set; }
    public Guid RemarkId { get; set; }
    public string Option { get; set; }
}