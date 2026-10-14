using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.AwardsAndPrizes.Dto;

public class UpdatePrizeTypeInput:EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
    
}