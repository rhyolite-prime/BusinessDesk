using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.ParentProfessions.Dto;

public class UpdateParentProfessionInput : EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}