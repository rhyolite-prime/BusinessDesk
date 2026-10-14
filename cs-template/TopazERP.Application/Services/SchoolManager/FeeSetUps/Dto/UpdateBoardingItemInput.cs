using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.FeeSetUps.Dto;

public class UpdateBoardingItemInput: EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; } 
}