using System;
using System.Collections.Generic;
using Abp.Application.Services.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.StudentPromotions.Dto;

public class UpdatePreClassPromotionInput:EntityDto<Guid>
{
    public Guid AcademicYearId { get; set; }
    public Guid FromClassId { get; set; }
    public Guid ToClassId { get; set; }
    public bool IsIndividualClass { get; set; }
    public bool IsEntireLevel { get; set; }
    public bool IsAlumni { get; set; }
    public Guid EntireLevelClassId { get; set; }
    public int TenantId { get; set; }
    public List<PromotedStudents> Students { get; set; }
}