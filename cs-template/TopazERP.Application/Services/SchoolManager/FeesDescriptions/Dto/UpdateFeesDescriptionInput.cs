using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.FeesDescriptions.Dto;

public class UpdateFeesDescriptionInput : EntityDto<Guid>
{
    public string Description { get; set; }
    public int TenantId { get; set; }
}