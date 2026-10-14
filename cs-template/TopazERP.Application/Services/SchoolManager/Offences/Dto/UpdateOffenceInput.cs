using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.Offences.Dto;

public class UpdateOffenceInput : EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}