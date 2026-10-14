using System;

namespace TopazERP.Models.Sch;

public class BillDetail
{
    public Guid Id { get; set; }
    public Guid BillId { get; set; }
    public Guid FeeItemId { get; set; }
    public decimal Amount { get; set; }
}