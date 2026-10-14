using System.Collections.Generic;

namespace TopazERP.Services.SchoolManager.ProcessBills.Dto;

public class ProcessMultipleBillsInput
{
    public List<CreateBillInput> Items { get; set; }
}