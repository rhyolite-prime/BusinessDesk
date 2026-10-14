using System;
using Abp.Domain.Entities;

namespace TopazERP.Services.SchoolManager.SubjectRemarks.Dto;

public class UpdateSubjectRemarkInput:Entity<Guid>
{
    public string Stage { get; set; }
    public string GradeNumber { get; set; }
    public decimal MinMark { get; set; }
    public decimal MaxMark { get; set; }
    public string Remark { get; set; }
    public int TenantId { get; set; }
}