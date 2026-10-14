using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Shared
{
    public class City : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid CountryId { get; set; }
        public Guid CountryStateId { get; set; }
        public string Name { get; set; }
        public int TenantId { get; set; }

    }
}
