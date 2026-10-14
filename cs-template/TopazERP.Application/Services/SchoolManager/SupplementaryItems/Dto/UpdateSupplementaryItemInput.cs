using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.SupplementaryItems.Dto;

public class UpdateSupplementaryItemInput : EntityDto<Guid>
{
    public string Name { get; set; }
    public bool IsFixed { get; set; }
    public int TenantId { get; set; }
}