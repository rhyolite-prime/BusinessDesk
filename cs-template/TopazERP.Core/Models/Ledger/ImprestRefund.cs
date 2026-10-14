using System;

namespace TopazERP.Models.Ledger
{
    public class ImprestRefund : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid ImprestId { get; set; }
        public Guid EmployeeId { get; set; }
        public DateTime RefundDate { get; set; }
        public decimal Amount { get; set; }
        public Guid CurrencyId { get; set; }
        public decimal Rate { get; set; }
        public Guid? AuthorizedBy { get; set; }
        public string RefundType { get; set; }
        public DateTime ReceiptDate { get; set; }
        public string ReceiptNo { get; set; }
        public string RefundReceivedBy { get; set; }
        public Guid DebitAccountId { get; set; }
        public Guid CreditAccountId { get; set; }
        public string Notes { get; set; }
        public bool PostedToGL { get; set; }
        public int TenantId { get; set; }
    }
}