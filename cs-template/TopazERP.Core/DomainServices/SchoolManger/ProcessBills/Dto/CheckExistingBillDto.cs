using System;

namespace TopazERP.DomainServices.SchoolManger.ProcessBills.Dto;

public class CheckExistingBillDto
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public int BillTypeId { get; set; }
    public int BillingScopeId { get; set; }

    public Guid ClassId { get; set; }
    public Guid LevelId { get; set; }

    public Guid? FeeItemId { get; set; } 
}