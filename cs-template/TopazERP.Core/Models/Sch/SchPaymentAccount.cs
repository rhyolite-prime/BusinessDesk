using System;

namespace TopazERP.Models.Sch;

public class SchPaymentAccount: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid LocalDebitGlId { get; set; }
    public Guid ForeignDebitGlId { get; set; }
    public Guid LocalCreditGlId { get; set; }
    public Guid LocalOverPaymentGlId { get; set; }
    public Guid ForeignOverPaymentGlId { get; set; }
    public Guid OtherPaymentDebitGlId { get; set; }
    public Guid OtherPaymentCreditGlId { get; set; }
    public int TenantId { get; set; }
}