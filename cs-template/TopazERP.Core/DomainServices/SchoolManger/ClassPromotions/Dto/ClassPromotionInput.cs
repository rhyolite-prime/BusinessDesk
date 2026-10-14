using System;
using System.Collections.Generic;

namespace TopazERP.DomainServices.SchoolManger.ClassPromotions.Dto;

public class ClassPromotionInput
{
    public DateTime StartDate { get; set; }
    public List<ClassList> Classes { get; set; }  
    public int TenantId { get; set; }
}

public class ClassList
{
    public Guid FromClassId { get; set; }
    public string FromClassName { get; set; }
    public Guid ToClassId { get; set; }
    public string ToClassName { get; set; }
}
