using System;
using System.Collections.Generic;
using Abp.Application.Services.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.Hostels.Dto;

public class UpdateHostelInput:EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
    public List<HostelDetail> Details { get; set; }
}