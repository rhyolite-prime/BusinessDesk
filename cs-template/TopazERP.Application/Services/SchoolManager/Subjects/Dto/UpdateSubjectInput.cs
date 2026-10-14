using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.Subjects.Dto;

public class UpdateSubjectInput : EntityDto<Guid>
{
    public string Name { get; set; }
    public string Abbreviation { get; set; }
    public bool IsCore { get; set; }
    public bool IsBestSubject { get; set; }
    public int TenantId { get; set; }
}