using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.StudentImmunizations.Dto;

public class UpdateImmunizationInput: EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}