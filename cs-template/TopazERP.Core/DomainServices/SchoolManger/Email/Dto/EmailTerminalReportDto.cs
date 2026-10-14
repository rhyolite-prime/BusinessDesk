using System;
using System.Collections.Generic;

namespace TopazERP.DomainServices.SchoolManger.Email.Dto;

public class EmailTerminalReportDto
{
    public Guid ClassId { get; set; }
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }

    public List<Guid> StudentIds { get; set; } = new();
}