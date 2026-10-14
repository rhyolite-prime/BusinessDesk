using System;
using System.Collections.Generic;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.StudentPromotions.Dto;

public class CreateStudentPromotionInput
{
    public Guid AcademicYearId { get; set; }
    public Guid FromClassId { get; set; }
    public Guid ToClassId { get; set; }
    public bool IsIndividualClass { get; set; }
    public bool IsEntireLevel { get; set; }
    public bool IsAlumni { get; set; }
    public Guid EntireLevelClassId { get; set; }
    public List<PromotedStudents> Students { get; set; }
}