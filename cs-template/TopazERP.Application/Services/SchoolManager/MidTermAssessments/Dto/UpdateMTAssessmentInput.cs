using System;
using System.Collections.Generic;
using Abp.Application.Services.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.MidTermAssessments.Dto;

public class UpdateMTAssessmentInput:EntityDto<Guid>
{
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public Guid AcademicYearId {get; set;}
    public string AcademicYearName { get; set; }
    public Guid TermId { get; set; }
    public string TermName { get; set; }
    public int TenantId { get; set; }
    public List<Assessment> Assessment { get; set; }
}