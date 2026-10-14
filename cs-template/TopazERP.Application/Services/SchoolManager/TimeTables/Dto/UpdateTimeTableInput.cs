using System;
using System.Collections.Generic;
using Abp.Application.Services.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.TimeTables.Dto;

public class UpdateTimeTableInput:EntityDto<Guid>
{
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid TermId { get; set; }
    public string TermName { get; set; }
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public string Day { get; set; }
    public List<TimeTableDetail> Details { get; set; }
    public int TenantId { get; set; }
    
}