using System;
using System.Collections.Generic;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.FeeSetUps.Dto;

public class CreateBoardingFeeInput
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public Guid ClassId { get; set; }
    public List<BoardingFeeDetail> Details { get; set; }
}