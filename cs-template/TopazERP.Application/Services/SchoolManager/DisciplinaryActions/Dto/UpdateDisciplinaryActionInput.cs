using System;
using Abp.Application.Services.Dto;
using Abp.Domain.Entities;

namespace TopazERP.Services.SchoolManager.DisciplinaryActions.Dto;

public class UpdateDisciplinaryActionInput:EntityDto<Guid>
{
    public string ActionDescription { get; set; }
    public int TenantId { get; set; }
}