using System;
using System.Collections.Generic;
using TopazERP.DomainServices.SchoolManger.ClassPromotions.Dto;

namespace TopazERP.Services.SchoolManager.ClassPromotions.Dto;

public class CreateClassPromotionInput
{
    public DateTime StartDate { get; set; }
    public Guid FromClassId { get; set; }
    public string FromClassName { get; set; }
    public Guid ToClassId { get; set; }
    public string ToClassName { get; set; }
    
  
}