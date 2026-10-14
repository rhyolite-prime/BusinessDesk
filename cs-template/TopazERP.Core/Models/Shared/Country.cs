using Abp.Domain.Entities.Auditing;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Shared
{
   public class Country : FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string Name { get; set; }
        public string Code { get; set; }
        public int NumericIsoCode { get; set; }
        public string Nationality { get; set; }
        public int TenantId { get; set; }
    }
}
