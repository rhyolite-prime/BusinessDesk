using System;

namespace TopazERP.DomainServices.Ap.OpeningBalances.Dto;

public class CostCenterDto
{
    public Guid Id { get; set; }
    public Guid ParentId { get; set; }
    public string RawName { get; set; }
    public string Name { get; set; } 
    public int TenantId { get; set; }
}