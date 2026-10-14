using System;

namespace TopazERP.Models.Sch;

public class SchBillAccount: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public int BillTypeId { get; set; }
    public Guid FeeItemId { get; set; }
    public Guid BankGlId { get; set; }
    public Guid DebitGlId { get; set; }
    public Guid CreditGlId { get; set; }
    public int TenantId { get; set; }
}