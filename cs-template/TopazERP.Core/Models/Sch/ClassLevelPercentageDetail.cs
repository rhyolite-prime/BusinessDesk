using System;

namespace TopazERP.Models.Sch;

public class ClassLevelPercentageDetail
{
    public Guid Id { get; set; }
    public Guid ClassLevelPercentageId { get; set; }
    public Guid LevelId { get; set; }
    public string LevelName { get; set; }
    public decimal ExamPercentage { get; set; }
    public decimal ClassPercentage { get; set; }
}