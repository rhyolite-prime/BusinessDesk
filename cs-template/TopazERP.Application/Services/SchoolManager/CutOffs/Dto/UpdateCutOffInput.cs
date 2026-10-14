using System;
using Abp.Application.Services.Dto;
using Abp.Domain.Entities;

namespace TopazERP.Services.SchoolManager.CutOffs.Dto;

public class UpdateCutOffInput:EntityDto<Guid>
{
    public decimal CutOfMark { get; set; }
    public int TenantId { get; set; }
}