using System;
using System.Collections.Generic;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.AwardsAndPrizes.Dto;

public class CreatePrizeAwardedInput
{
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid TermId { get; set; }
    public string TermName { get; set; }
    public Guid LevelId { get; set; }
    public string LevelName { get; set; }
    public List<PrizeAwardDetail> Details { get; set; }
}