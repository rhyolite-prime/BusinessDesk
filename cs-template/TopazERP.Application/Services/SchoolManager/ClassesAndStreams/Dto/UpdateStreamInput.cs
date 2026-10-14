using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.ClassesAndStreams.Dto;

public class UpdateStreamInput:EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}