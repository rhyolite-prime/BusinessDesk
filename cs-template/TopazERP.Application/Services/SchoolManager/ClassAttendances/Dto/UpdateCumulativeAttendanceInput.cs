using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.ClassAttendances.Dto;

public class UpdateCumulativeAttendanceInput:EntityDto<Guid>
{
    public Guid AcademicYearId { get; set; }
    public Guid ClassId { get; set; }
    public Guid TermId { get; set; }
    public Guid StudentId { get; set; }
    public int Days { get; set; }
    public int TenantId { get; set; }
}