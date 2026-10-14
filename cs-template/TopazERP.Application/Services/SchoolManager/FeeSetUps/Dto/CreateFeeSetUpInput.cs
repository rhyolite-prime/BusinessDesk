using System;
using System.Collections.Generic;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.FeeSetUps.Dto;

public class CreateFeeSetUpInput
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public Guid ClassId { get; set; }
    public Guid LevelId { get; set; }
    public bool IsClassFee { get; set; }
    public bool IsLevelFee { get; set; }
    public bool IsSchoolFee { get; set; }
    public string FeeType { get; set; }
    public List<FeeSetUpDetail> Details { get; set; }
}