using System;
using System.Collections.Generic;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.AssignSubjects.Dto;

public class CreateAssignSubjectInput
{
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public Guid TermId { get; set; }
    public string TermName { get; set; }
    public List<AssignedSubjectsDetail> Details { get; set; }
}