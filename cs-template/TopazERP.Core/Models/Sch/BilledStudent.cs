using System;

namespace TopazERP.Models.Sch;

public class BilledStudent
{
    public Guid Id { get; set; }
    public Guid BillId { get; set; }
    public Guid StudentId { get; set; }
    public bool ToBeBilled { get; set; }
    public bool IsDiscounted { get; set; }
    public decimal Amount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal DiscountPercentage { get; set; }
}