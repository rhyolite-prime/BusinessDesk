using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.ClassRooms.Dto;

public class UpdateClassRoomInput:EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}