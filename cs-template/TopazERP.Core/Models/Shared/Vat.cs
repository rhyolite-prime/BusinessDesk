using System;

namespace TopazERP.Models.Shared
{

    public class VatTaxLevy : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string Name { get; set; }
        public decimal Rate { get; set; }
        public bool isApplied { get; set; }
        public int TenantId { get; set; }
    }

}