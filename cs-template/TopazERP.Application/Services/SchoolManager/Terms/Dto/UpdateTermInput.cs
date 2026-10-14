using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.Terms.Dto;

public class UpdateTermInput:EntityDto<Guid>
{
    public string Name { get; set; }
    public int Ordinal { get; set; }
    public int TenantId { get; set; }
}