using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.SchoolGroups.Dto;

public class UpdateSchoolGroupInput : EntityDto<Guid>
{
    public string Name { get; set; }
    public Guid StaffId { get; set; }
    public string StaffName { get; set; }
    public int TenantId { get; set; }
}