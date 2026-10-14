using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.AcademicYears.Dto;

public class UpdateAcademicYearInput:EntityDto<Guid>
{
    public string Name { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; }
    public int TenantId { get; set; }
}