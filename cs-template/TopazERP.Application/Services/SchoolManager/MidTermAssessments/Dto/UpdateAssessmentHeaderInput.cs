using System;
using System.Collections.Generic;
using Abp.Application.Services.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.MidTermAssessments.Dto;

public class UpdateAssessmentHeaderInput:EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
    public List<AssessmentRemarkOption> Options { get; set; }
    
}