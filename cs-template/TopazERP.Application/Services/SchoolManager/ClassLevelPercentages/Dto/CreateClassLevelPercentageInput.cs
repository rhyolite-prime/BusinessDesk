using System;
using System.Collections.Generic;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.ClassLevelPercentages.Dto;

public class CreateClassLevelPercentageInput
{
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public List<ClassLevelPercentageDetail> Details { get; set; }
}