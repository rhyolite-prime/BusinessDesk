using System;
using System.Collections.Generic;
using Abp.Application.Services.Dto;
using TopazERP.DomainServices.SchoolManger.ClassAttendances.Dto;

namespace TopazERP.Services.SchoolManager.ClassAttendances.Dto;

public class UpdateAttendanceInput:EntityDto<Guid>
{
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public DateTime Date { get; set; }
    public Guid StudentId { get; set; }
    public string StudentIdentifier { get; set; }
    public string StudentName { get; set; }
    public bool IsPresent { get; set; }
    public int TenantId { get; set; }
}