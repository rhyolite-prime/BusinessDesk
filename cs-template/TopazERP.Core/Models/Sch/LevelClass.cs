using System;

namespace TopazERP.Models.Sch;

public class LevelClass : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
   public Guid LevelId { get; set; }
   public string LevelName { get; set; }
   public Guid ClassId { get; set; }
   public string ClassName { get; set; }
   public bool IsHighestClass { get; set; }
   public Guid StreamId { get; set; }
   public string StreamName { get; set; }
   public int Ordinal { get; set; }
   public int TenantId { get; set; }
}