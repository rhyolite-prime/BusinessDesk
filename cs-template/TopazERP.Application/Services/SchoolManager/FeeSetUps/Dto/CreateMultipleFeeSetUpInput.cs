using System.Collections.Generic;

namespace TopazERP.Services.SchoolManager.FeeSetUps.Dto;

public class CreateMultipleFeeSetUpInput
{
    public List<CreateFeeSetUpInput> Items { get; set; }
}
