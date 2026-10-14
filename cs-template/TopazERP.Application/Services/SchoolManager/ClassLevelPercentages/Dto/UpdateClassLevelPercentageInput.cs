using System;
using System.Collections.Generic;
using Abp.Application.Services.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.ClassLevelPercentages.Dto;

public class UpdateClassLevelPercentageInput:EntityDto<Guid>
{
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public List<ClassLevelPercentageDetail> Details { get; set; }
    
    public int TenantId { get; set; }
}