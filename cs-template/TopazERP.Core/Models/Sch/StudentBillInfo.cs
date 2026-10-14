using System;

namespace TopazERP.Models.Sch;

public class StudentBillInfo: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AcademicYearId { get; set; }
    public Guid TermId { get; set; }
    public Guid ClassId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public Guid BillId { get; set; }
    public string BillNumber { get; set; }
    public decimal Amount { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal BalanceDue { get; set; }
    public DateTime BillDate { get; set; }
    public int BillStatusId { get; set; }
    public bool IsCanceled { get; set; }
    public string CanceledBy { get; set; } 
    public int TenantId { get; set; }
}