using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.StudentPositions.Dto;

public class UpdateStudentPositionInput: EntityDto<Guid>
{
    public Guid PositionId { get; set; }
    public string PositionName { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public int TenantId { get; set; }
}