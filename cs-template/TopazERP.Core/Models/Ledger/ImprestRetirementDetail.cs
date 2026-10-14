using System;

namespace TopazERP.Models.Ledger
{
    public class ImprestRetirementDetail : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid ImprestRetirementId { get; set; }
        public DateTime ReceiptDate { get; set; }
        public string ReceiptNo { get; set; }
        public string Description { get; set; }
        public decimal Amount { get; set; }
        public Guid DebitAccountId { get; set; }
        public Guid CreditAccountId { get; set; }
        public Guid OuId { get; set; }
        public int TenantId { get; set; }
    }
}
