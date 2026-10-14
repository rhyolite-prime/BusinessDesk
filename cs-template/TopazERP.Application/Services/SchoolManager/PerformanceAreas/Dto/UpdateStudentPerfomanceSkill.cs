using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.PerformanceAreas.Dto;

public class UpdateStudentPerfomanceSkill:EntityDto<Guid>
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public Guid ClassId { get; set; }
    public DateTime Date { get; set; }
    public Guid StudentId { get; set; }
    public Guid PerformanceSkillId { get; set; }
    public Guid PerformanceAreaId { get; set; }
    public int TenantId { get; set; }
}