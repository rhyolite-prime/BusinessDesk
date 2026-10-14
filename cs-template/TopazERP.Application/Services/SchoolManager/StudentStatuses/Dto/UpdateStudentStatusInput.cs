using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.StudentStatuses.Dto;

public class UpdateStudentStatusInput:EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
   
}