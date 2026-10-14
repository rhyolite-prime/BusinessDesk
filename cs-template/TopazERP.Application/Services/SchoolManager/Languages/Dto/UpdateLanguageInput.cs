using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.Languages.Dto;

public class UpdateLanguageInput : EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}