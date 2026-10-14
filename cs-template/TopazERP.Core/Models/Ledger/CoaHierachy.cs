using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ledger
{
   public class CoaHierachy : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid ParentId { get; set; }
        public int TenantId { get; set; }
        public int StandardAccountType { get; set; } // StandardAccountType enum
        public string Name { get; set; }
    }
}
