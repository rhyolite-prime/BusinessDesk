using System.Collections.Generic;

namespace TopazERP.Services.SchoolManager.FeeSetUps.Dto;

public class CreateMultipleBoardingFeesInput
{
    public List<CreateBoardingFeeInput> Items { get; set; }
}