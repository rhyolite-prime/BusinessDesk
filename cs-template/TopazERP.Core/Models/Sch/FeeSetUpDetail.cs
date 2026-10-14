using System;

namespace TopazERP.Models.Sch;

public class FeeSetUpDetail
{
    public Guid Id { get; set; }
    public Guid FeeSetUpId { get; set; }
    public Guid FeesItemId { get; set; }
    public decimal Amount { get; set; }
}