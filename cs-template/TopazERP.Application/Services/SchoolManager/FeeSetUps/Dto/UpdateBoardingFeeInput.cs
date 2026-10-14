using System;
using System.Collections.Generic;
using Abp.Application.Services.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.FeeSetUps.Dto;

public class UpdateBoardingFeeInput: EntityDto<Guid>
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public Guid ClassId { get; set; }
    public int TenantId { get; set; }
    public List<BoardingFeeDetail> Details { get; set; }
}