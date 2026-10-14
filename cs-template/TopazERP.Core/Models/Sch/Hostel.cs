using System;
using System.Collections.Generic;

namespace TopazERP.Models.Sch;

public class Hostel: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string Name { get; set; }
    public int TenantId { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<HostelDetail> Details { get; set; }
}