using System;

namespace TopazERP.Models.Ledger
{
    public class ImprestWriteoff : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid ImprestId { get; set; }
        public Guid EmployeeId { get; set; }
        public DateTime WriteOffDate { get; set; }
        public decimal Amount { get; set; }
        public Guid CurrencyId { get; set; }
        public decimal Rate { get; set; }
        public Guid? AuthorizedBy { get; set; }
        public string WrittenOffBy { get; set; }
        public Guid DebitAccountId { get; set; }
        public Guid CreditAccountId { get; set; }
        public string Notes { get; set; }
        public bool PostedToGL { get; set; }
        public int TenantId { get; set; }
    }
}