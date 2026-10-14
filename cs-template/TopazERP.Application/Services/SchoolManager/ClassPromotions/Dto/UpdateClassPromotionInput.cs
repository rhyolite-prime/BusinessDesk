using System;
using Abp.Application.Services.Dto;


namespace TopazERP.Services.SchoolManager.ClassPromotions.Dto;

public class UpdateClassPromotionInput:EntityDto<Guid>
{
    public DateTime StartDate { get; set; }
    public Guid FromClassId { get; set; }
    public string FromClassName { get; set; }
    public Guid ToClassId { get; set; }
    public string ToClassName { get; set; }
    public int TenantId { get; set; }
    
}