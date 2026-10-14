using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.Titles.Dto;

public class UpdateTitleInput : EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}