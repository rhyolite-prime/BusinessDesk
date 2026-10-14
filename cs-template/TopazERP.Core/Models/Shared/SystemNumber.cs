using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Shared
{
   public class SystemNumber : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string ModuleName { get; set; }
        public string ItemName { get; set; }
        
        public string FriendlyName { get; set; }
        public string Prefix { get; set; }
        public string Suffix { get; set; }
        public int TenantId { get; set; }
        public int LastNo { get; set; }
    }
}
