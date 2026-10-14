using System;
using System.Collections.Generic;
using Abp.Application.Services.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.BehavioralAssessments.Dto;

public class UpdateBehavioralAssessmentInput:EntityDto<Guid>
{
    public int TenantId { get; set; }

    public Guid ClassId { get; set; }
    public string ClassName { get; set; }

    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }

    public Guid TermId { get; set; }
    public string TermName { get; set; }
    public string AssessmentType {get; set;}
    public List<BehavioralAssessmentImport> Assessments { get; set; }
}