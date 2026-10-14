using System;
using System.ComponentModel.DataAnnotations;

namespace TopazERP.Models.Shared;

public class PersonnelStatus : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    [MaxLength(40)] 
    public string Name { get; set; }
    public bool IsDefault { get; set; }
    public int TenantId { get; set; }
}