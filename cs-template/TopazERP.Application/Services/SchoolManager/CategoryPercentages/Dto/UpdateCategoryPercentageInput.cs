using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.CategoryPercentages.Dto;

public class UpdateCategoryPercentageInput:EntityDto<Guid>
{
    public decimal ExamPercentage { get; set; }
    public decimal Cat1Percentage { get; set; }
    public decimal Cat2Percentage { get; set; }
    public decimal Cat3Percentage { get; set; }
    public decimal Cat4Percentage { get; set; }
    
    public int TenantId { get; set; }
}