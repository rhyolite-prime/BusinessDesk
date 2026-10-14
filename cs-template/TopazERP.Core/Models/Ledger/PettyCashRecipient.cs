using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ledger
{
   public class PettyCashRecipient : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string Recipient { get; set; }
        public string PhoneNo { get; set; }
        public string Email { get; set; }
        public int TenantId { get; set; }
    }
}
