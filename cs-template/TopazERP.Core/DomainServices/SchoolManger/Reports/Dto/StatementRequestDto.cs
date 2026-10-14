using System;
using System.Collections.Generic;

namespace TopazERP.DomainServices.SchoolManger.Reports.Dto;

public class StatementRequestDto
{
    public List<Guid> StudentIds { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }
}