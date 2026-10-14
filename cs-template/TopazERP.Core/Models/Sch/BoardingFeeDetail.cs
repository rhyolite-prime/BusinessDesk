using System;

namespace TopazERP.Models.Sch;

public class BoardingFeeDetail
{
    public Guid Id { get; set; }
    public Guid BoardingFeeId { get; set; }
    public Guid BoardingItemId { get; set; }
    public decimal Amount { get; set; }
}