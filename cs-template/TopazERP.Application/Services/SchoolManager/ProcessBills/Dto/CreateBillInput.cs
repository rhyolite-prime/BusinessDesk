using System;
using System.Collections.Generic;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.ProcessBills.Dto;

public class CreateBillInput
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public Guid ClassId { get; set; }
    public Guid LevelId { get; set; }
    public string BillNumber { get; set; }
    public DateTime BillDate { get; set; }
    public int BillingScopeId { get; set; }
    public bool IsProcessed { get; set; }
    public bool IsPosted { get; set; }
    public bool IsCancelled { get; set; }
    public string CanceledBy { get; set; }
    public DateTime? CanceledDate { get; set; }
    public int BillTypeId { get; set; }
    public string BatchNumber { get; set; }
    public List<BillDetail> Details { get; set; }
    public List<BilledStudent> Students { get; set; }
}