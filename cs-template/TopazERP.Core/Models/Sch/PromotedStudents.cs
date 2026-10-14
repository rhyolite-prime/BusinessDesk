using System;

namespace TopazERP.Models.Sch;

public class PromotedStudents
{
    public Guid Id { get; set; }
    public Guid PromotionId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentIdentifier { get; set; }
    public Guid ToClassId { get; set; }
}