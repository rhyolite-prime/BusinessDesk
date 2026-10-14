using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.RemarkByTeachers.Dto;

public class UpdateRemarksInput:EntityDto<Guid>
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public Guid ClassId { get; set; }
    public string TeacherType { get; set; }
    public string RemarkType { get; set; }
    public string Remark { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public string StudentIdentifier { get; set; }
    public int TenantId { get; set; }
    
}