using System;

namespace TopazERP.Models.Sch;

public class PrizeAwardDetail
{
    public Guid Id { get; set; }
    public Guid PrizeAwardId { get; set; }
    public Guid AwardId { get; set; }
    public string AwardName { get; set; }
    public Guid PrizeId { get; set; }
    public string PrizeName { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
}