using Abp.Application.Services.Dto;
using System;


namespace TopazERP.Services.Shared.Statuses.Dto;

public class UpdateStatusInput:EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
    
}