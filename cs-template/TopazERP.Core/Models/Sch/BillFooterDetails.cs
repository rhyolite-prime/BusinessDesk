using System;

namespace TopazERP.Models.Sch;

public class BillFooterDetails
{
    public Guid Id { get; set; }
    public Guid BillFooterId { get; set; }
    public Guid StudentId { get; set; }
    public Guid ClassId { get; set; }
    public Guid LevelId { get; set; }
}