using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.Assignments.Dto;

public class UpdateResultPeriodInput:EntityDto<Guid>
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TenantId { get; set; }
}