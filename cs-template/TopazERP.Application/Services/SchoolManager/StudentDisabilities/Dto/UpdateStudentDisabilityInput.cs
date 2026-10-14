using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.StudentDisabilities.Dto;

public class UpdateStudentDisabilityInput : EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}