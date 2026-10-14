using System;
using System.Collections.Generic;
using Abp.Application.Services.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.AwardsAndPrizes.Dto;

public class UpdatePrizeAwardedInput:EntityDto<Guid>
{
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid TermId { get; set; }
    public string TermName { get; set; }
    public Guid LevelId { get; set; }
    public string LevelName { get; set; }
    public List<PrizeAwardDetail> Details { get; set; }
    public int TenantId { get; set; }
}