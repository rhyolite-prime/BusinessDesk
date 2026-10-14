using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.SchoolGroups.Dto;

public class UpdateSchoolGroupPositionInput : EntityDto<Guid>
{
    public string Name { get; set; }
    public Guid SchoolGroupId { get; set; }
    public string SchoolGroupName { get; set; }
    public int TenantId { get; set; }
}