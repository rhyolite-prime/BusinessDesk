using System;
using System.Collections.Generic;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.MidTermAssessments.Dto;

public class CreateMTAssessmentInput
{
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public Guid AcademicYearId {get; set;}
    public string AcademicYearName { get; set; }
    public Guid TermId { get; set; }
    public string TermName { get; set; }
    public List<Assessment> Assessment { get; set; }
}