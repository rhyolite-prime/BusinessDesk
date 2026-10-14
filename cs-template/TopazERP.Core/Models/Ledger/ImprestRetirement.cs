using System;

namespace TopazERP.Models.Ledger
{
    public class ImprestRetirement : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid ImprestId { get; set; }
        public Guid EmployeeId { get; set; }
        public DateTime RetirementDate { get; set; }
        public decimal AmountRetired { get; set; }
        public Guid CurrencyId { get; set; }
        public decimal Rate { get; set; }
        public string RetiredBy { get; set; }
        public bool PostedToGL { get; set; }
        public int TenantId { get; set; }
    }
}