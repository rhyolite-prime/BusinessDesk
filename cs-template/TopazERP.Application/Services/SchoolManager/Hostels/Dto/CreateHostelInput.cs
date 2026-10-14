using System.Collections.Generic;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.Hostels.Dto;

public class CreateHostelInput
{
    public string Name { get; set; }
    public List<HostelDetail> Details { get; set; }
}