using System;

namespace TopazERP.Models.Sch;

public class SchCreditMemoAccount: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid DebitGlId { get; set; }
    public Guid CreditGlId { get; set; }
    public int TenantId { get; set; }
}