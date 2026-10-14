using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.ChangeStudentStatuses.Dto;

public class UpdateChangeStudentStatusInput:EntityDto<Guid>
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public string StudentIdentifier { get; set; }
    public string Reason { get; set; }
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid StatusId { get; set; }
    public string StatusName { get; set; }
    public DateTime ChangeDate { get; set; }
    public int TenantId { get; set; }
}