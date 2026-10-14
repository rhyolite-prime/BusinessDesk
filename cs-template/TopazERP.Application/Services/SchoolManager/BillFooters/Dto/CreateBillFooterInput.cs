using System;
using System.Collections.Generic;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.BillFooters.Dto;

public class CreateBillFooterInput
{
    public string Message { get; set; }
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public bool ToSchool { get; set; }
    public bool ToClass { get; set; }
    public int OrderNumber { get; set; }
    public List<BillFooterDetails> Details { get; set; }
}