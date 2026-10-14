using System;
using System.Collections.Generic;
using Abp.Application.Services.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.Excursions.Dto;

public class UpdateExcursionInput:EntityDto<Guid>
{
    public DateTime DepartureDate { get; set; }
    public TimeSpan DepartureTime { get; set; }
    public DateTime ReturnDate { get; set; }
    public TimeSpan ReturnTime { get; set; }
    public string Point { get; set; }
    public string Destination { get; set; }
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid TermId { get; set; }
    public string TermName { get; set; }
    public List<StudentExcursion> Students { get; set; }
    public List<TeacherExcursion> Teachers { get; set; }
    public int TenantId { get; set; }
}