using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.AcademicYears.Dto;

public class UpdateAcademicYearTermDetailInput:EntityDto<Guid>
{
    public Guid AcademicYearTermId { get; set; }
    public string AcademicYearTermName { get; set; }
    public string ActivityDescription { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TenantId { get; set; }
}