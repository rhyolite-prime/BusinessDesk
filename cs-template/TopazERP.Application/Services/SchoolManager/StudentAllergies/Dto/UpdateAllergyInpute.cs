using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.StudentAllergies.Dto;

public class UpdateAllergyInput: EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}