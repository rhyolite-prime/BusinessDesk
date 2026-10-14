using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.StudentDisabilities.Dto;

public class UpdateDisabilityInput: EntityDto<Guid>
{
    public Guid DisabilityId { get; set; }
    public string DisabilityName { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public int TenantId { get; set; }
}