using System;

namespace TopazERP.DomainServices.SchoolManger.Reports.Dto;

public class FeeSetupItemDto
{
    public Guid FeeItemId { get; set; }
    public string ItemName { get; set; }
    public decimal Amount { get; set; }
    public string FeeType { get; set; }
}