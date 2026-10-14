using System.Collections.Generic;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.MidTermAssessments.Dto;

public class CreateAssessmentHeaderInput
{
    public string Name { get; set; }
    public List<AssessmentRemarkOption> Options { get; set; }
}