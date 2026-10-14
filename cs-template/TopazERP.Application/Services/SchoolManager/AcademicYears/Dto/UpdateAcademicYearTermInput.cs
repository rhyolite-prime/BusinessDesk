using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.AcademicYears.Dto;

public class UpdateAcademicYearTermInput:EntityDto<Guid>
{
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid TermId { get; set; }
    public string TermName { get; set; }
    public int Ordinal { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public Guid ActualLevelId { get; set; }
    public string ActualLevelName { get; set; }
    public int TenantId { get; set; }
}